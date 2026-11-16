// Polls the hook state file and reports busy/idle changes and new turns. No VS Code import.
// Polling (stat every interval, read only when mtime/size change) is used instead of
// fs.watch because the hooks replace the file by rename, which fs.watch reports
// inconsistently across platforms and WSL; the timer is also needed for stale detection.

import { readFile, stat } from 'node:fs/promises';
import { IDLE, parseState, type ClaudeState } from './state';

export interface StateChange {
  state: ClaudeState;
  previous: ClaudeState;
  /**
   * A prompt was submitted: idle→busy, or a busy with a newer timestamp
   * (Stop does not fire when the user interrupts Claude, so busy can follow busy).
   */
  newTurn: boolean;
}

export interface StateWatcherOptions {
  file: string;
  staleMinutes: () => number;
  onChange: (change: StateChange) => void;
  intervalMs?: number;
  nowSeconds?: () => number;
}

export class StateWatcher {
  private current: ClaudeState = IDLE;
  private content: string | undefined;
  private fingerprint = '';
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;

  constructor(private readonly opts: StateWatcherOptions) {}

  get state(): ClaudeState {
    return this.current;
  }

  /** Reads the file once as a baseline (no newTurn for what was already there), then polls. */
  async start(): Promise<void> {
    await this.poll(true);
    this.timer ??= setInterval(() => void this.poll(false), this.opts.intervalMs ?? 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** One polling step; exposed for tests. */
  async poll(baseline = false): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.refreshContent();
      const now = (this.opts.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
      const next = parseState(this.content, now, this.opts.staleMinutes());
      const previous = this.current;
      const newTurn =
        !baseline &&
        next.activity === 'busy' &&
        (previous.activity !== 'busy' || next.timestamp !== previous.timestamp);
      const changed = next.activity !== previous.activity || next.timestamp !== previous.timestamp;
      this.current = next;
      if (changed && (newTurn || next.activity !== previous.activity || baseline)) {
        this.opts.onChange({ state: next, previous, newTurn });
      }
    } finally {
      this.ticking = false;
    }
  }

  private async refreshContent(): Promise<void> {
    try {
      const s = await stat(this.opts.file);
      const fp = `${s.mtimeMs}:${s.size}`;
      if (fp === this.fingerprint) return;
      this.fingerprint = fp;
      this.content = await readFile(this.opts.file, 'utf8');
    } catch {
      this.fingerprint = '';
      this.content = undefined;
    }
  }
}

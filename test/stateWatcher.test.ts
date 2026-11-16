import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StateWatcher, type StateChange } from '../src/claude/stateWatcher';

describe('StateWatcher', () => {
  let dir: string;
  let file: string;
  let now: number;
  let changes: StateChange[];
  let w: StateWatcher;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qfcc-watch-'));
    file = join(dir, 'state');
    now = 1_800_000_000;
    changes = [];
    w = new StateWatcher({ file, staleMinutes: () => 30, nowSeconds: () => now, onChange: (c) => changes.push(c) });
  });
  afterEach(() => {
    w.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  // Distinct content per write so size/mtime always change.
  const write = (s: string) => writeFileSync(file, s);
  const summary = () => changes.map((c) => `${c.state.activity}${c.newTurn ? '+turn' : ''}`);

  it('treats an existing busy file as baseline, not a new turn', async () => {
    write(`busy ${now}`);
    await w.poll(true);
    assert.deepEqual(summary(), ['busy']);
  });

  it('reports idle→busy as a new turn and busy→idle as a change', async () => {
    await w.poll(true);
    write(`busy ${now}`);
    await w.poll();
    write(`idle ${now + 10}`);
    await w.poll();
    assert.deepEqual(summary(), ['busy+turn', 'idle']);
  });

  it('reports busy→busy with a newer timestamp as a new turn (interrupted turn, no Stop)', async () => {
    await w.poll(true);
    write(`busy ${now}`);
    await w.poll();
    write(`busy ${now + 60}`);
    await w.poll();
    assert.deepEqual(summary(), ['busy+turn', 'busy+turn']);
  });

  it('does not repeat events when nothing changed', async () => {
    write(`busy ${now}`);
    await w.poll(true);
    await w.poll();
    await w.poll();
    assert.deepEqual(summary(), ['busy']);
  });

  it('goes idle when busy becomes stale, without a file change', async () => {
    await w.poll(true);
    write(`busy ${now}`);
    await w.poll();
    now += 31 * 60;
    await w.poll();
    assert.deepEqual(summary(), ['busy+turn', 'idle']);
  });

  it('goes idle when the file disappears', async () => {
    await w.poll(true);
    write(`busy ${now}`);
    await w.poll();
    unlinkSync(file);
    await w.poll();
    assert.deepEqual(summary(), ['busy+turn', 'idle']);
  });

  it('polls on a timer after start()', async () => {
    const live = new StateWatcher({ file, staleMinutes: () => 30, nowSeconds: () => now, intervalMs: 10, onChange: (c) => changes.push(c) });
    await live.start();
    write(`busy ${now}`);
    await new Promise((r) => setTimeout(r, 60));
    live.stop();
    assert.deepEqual(summary(), ['busy+turn']);
  });
});

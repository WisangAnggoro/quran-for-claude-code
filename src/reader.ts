// Reader state machine for continuous and random modes. Pure: no VS Code, no I/O.
// The bookmark is persisted through the injected store (globalState in the extension).

export type Mode = 'continuous' | 'random';

export interface BookmarkStore {
  get(): unknown;
  set(index: number): void;
}

export const RANDOM_HISTORY_LIMIT = 50;

export class Reader {
  private _mode: Mode;
  private _bookmark: number;
  private history: number[] = [];
  private cursor = -1;

  constructor(
    private readonly total: number,
    private readonly store: BookmarkStore,
    mode: Mode = 'continuous',
    private readonly rng: () => number = Math.random,
  ) {
    if (!Number.isInteger(total) || total < 1) throw new RangeError('total must be a positive integer');
    this._mode = mode;
    const saved = store.get();
    this._bookmark = typeof saved === 'number' && this.inRange(saved) ? saved : 0;
  }

  get mode(): Mode {
    return this._mode;
  }

  /** Continuous-mode position. Random mode never changes it. */
  get bookmark(): number {
    return this._bookmark;
  }

  /** The ayah to show now. */
  current(): number {
    if (this._mode === 'continuous') return this._bookmark;
    if (this.cursor < 0) this.pushRandom();
    return this.history[this.cursor];
  }

  setMode(mode: Mode): number {
    this._mode = mode;
    return this.current();
  }

  toggleMode(): Mode {
    this.setMode(this._mode === 'continuous' ? 'random' : 'continuous');
    return this._mode;
  }

  next(): number {
    if (this._mode === 'continuous') return this.moveBookmark(this.wrap(this._bookmark + 1));
    if (this.cursor < this.history.length - 1) this.cursor++;
    else this.pushRandom();
    return this.current();
  }

  prev(): number {
    if (this._mode === 'continuous') return this.moveBookmark(this.wrap(this._bookmark - 1));
    this.current(); // ensure history is seeded
    if (this.cursor > 0) this.cursor--;
    return this.current();
  }

  /** Jump to an ayah. Continuous: moves the bookmark. Random: adds it to history. */
  goTo(index: number): number {
    if (!this.inRange(index)) throw new RangeError(`index ${index} out of range`);
    if (this._mode === 'continuous') return this.moveBookmark(index);
    this.push(index);
    return index;
  }

  resetBookmark(): number {
    this.moveBookmark(0);
    return this.current();
  }

  private moveBookmark(index: number): number {
    if (index !== this._bookmark) {
      this._bookmark = index;
      this.store.set(index);
    }
    return index;
  }

  /** Uniform random ayah, different from the one currently shown. */
  private pushRandom(): void {
    const shown = this.cursor >= 0 ? this.history[this.cursor] : undefined;
    let pick: number;
    if (shown === undefined || this.total === 1) {
      pick = Math.floor(this.rng() * this.total);
    } else {
      pick = Math.floor(this.rng() * (this.total - 1));
      if (pick >= shown) pick++;
    }
    this.push(Math.min(pick, this.total - 1));
  }

  /** Append after the cursor (dropping any "forward" entries) and cap the history. */
  private push(index: number): void {
    this.history = this.history.slice(0, this.cursor + 1);
    this.history.push(index);
    if (this.history.length > RANDOM_HISTORY_LIMIT) this.history.shift();
    this.cursor = this.history.length - 1;
  }

  private wrap(i: number): number {
    return ((i % this.total) + this.total) % this.total;
  }

  private inRange(i: number): boolean {
    return Number.isInteger(i) && i >= 0 && i < this.total;
  }
}

import assert from 'node:assert/strict';
import { Reader, RANDOM_HISTORY_LIMIT, type BookmarkStore } from '../src/reader';

const TOTAL = 6236;

class MemoryStore implements BookmarkStore {
  writes: number[] = [];
  constructor(public value: unknown = undefined) {}
  get(): unknown {
    return this.value;
  }
  set(index: number): void {
    this.value = index;
    this.writes.push(index);
  }
}

/** Deterministic rng returning the given fractions in order, then repeating the last. */
function seq(...xs: number[]): () => number {
  let i = 0;
  return () => xs[Math.min(i++, xs.length - 1)];
}

/** rng that yields a different value each call. */
function counter(): () => number {
  let i = 0;
  return () => ((i++ * 0.618034) % 1);
}

describe('Reader: continuous mode', () => {
  it('starts at 1:1 with no saved bookmark', () => {
    assert.equal(new Reader(TOTAL, new MemoryStore()).current(), 0);
  });
  it('restores a saved bookmark', () => {
    assert.equal(new Reader(TOTAL, new MemoryStore(261)).current(), 261);
  });
  it('ignores an invalid saved bookmark', () => {
    for (const bad of [-1, TOTAL, 1.5, '3', null, {}]) {
      assert.equal(new Reader(TOTAL, new MemoryStore(bad)).current(), 0, String(bad));
    }
  });
  it('next/prev move and persist the bookmark', () => {
    const store = new MemoryStore(10);
    const r = new Reader(TOTAL, store);
    assert.equal(r.next(), 11);
    assert.equal(r.next(), 12);
    assert.equal(r.prev(), 11);
    assert.deepEqual(store.writes, [11, 12, 11]);
  });
  it('wraps from 114:6 to 1:1 and back', () => {
    const r = new Reader(TOTAL, new MemoryStore(TOTAL - 1));
    assert.equal(r.next(), 0);
    assert.equal(r.prev(), TOTAL - 1);
  });
  it('goTo moves the bookmark; reset returns to 1:1', () => {
    const store = new MemoryStore();
    const r = new Reader(TOTAL, store);
    assert.equal(r.goTo(261), 261);
    assert.equal(r.resetBookmark(), 0);
    assert.deepEqual(store.writes, [261, 0]);
    assert.throws(() => r.goTo(TOTAL), RangeError);
  });
  it('does not write when the bookmark does not change', () => {
    const store = new MemoryStore(5);
    new Reader(TOTAL, store).goTo(5);
    assert.deepEqual(store.writes, []);
  });
});

describe('Reader: random mode', () => {
  it('never touches the continuous bookmark', () => {
    const store = new MemoryStore(100);
    const r = new Reader(TOTAL, store, 'random', counter());
    r.current();
    r.next();
    r.prev();
    r.goTo(5);
    assert.equal(r.bookmark, 100);
    assert.deepEqual(store.writes, []);
    assert.equal(r.setMode('continuous'), 100);
  });
  it('maps rng uniformly and never repeats the shown ayah', () => {
    // total 10. First pick: floor(r*10). Later picks: floor(r*9), shifted up by one if >= shown.
    const r = new Reader(10, new MemoryStore(), 'random', seq(0.5, 0.5, 0.5, 0, 0.999));
    assert.equal(r.current(), 5); // floor(0.5*10)
    assert.equal(r.next(), 4); // floor(0.5*9)=4 < 5 → 4
    assert.equal(r.next(), 5); // floor(0.5*9)=4 >= shown 4 → 5 (skips the shown ayah)
    assert.equal(r.next(), 0); // floor(0*9)=0 < 5 → 0
    assert.equal(r.next(), 9); // floor(0.999*9)=8 >= 0 → 9 (top of range reachable)
  });
  it('walks back through history and forward again before picking new ayat', () => {
    const r = new Reader(TOTAL, new MemoryStore(), 'random', counter());
    const seen = [r.current(), r.next(), r.next()];
    assert.equal(r.prev(), seen[1]);
    assert.equal(r.prev(), seen[0]);
    assert.equal(r.prev(), seen[0], 'stays at oldest entry');
    assert.equal(r.next(), seen[1]);
    assert.equal(r.next(), seen[2]);
    assert.notEqual(r.next(), seen[2]);
  });
  it(`caps history at ${RANDOM_HISTORY_LIMIT}`, () => {
    const r = new Reader(TOTAL, new MemoryStore(), 'random', counter());
    const seen = [r.current()];
    for (let i = 0; i < 60; i++) seen.push(r.next());
    for (let i = 0; i < 100; i++) r.prev();
    assert.equal(r.current(), seen[seen.length - RANDOM_HISTORY_LIMIT]);
  });
  it('goTo after going back drops the forward entries', () => {
    const r = new Reader(TOTAL, new MemoryStore(), 'random', counter());
    const a = r.current();
    r.next();
    r.prev();
    assert.equal(r.goTo(7), 7);
    assert.equal(r.prev(), a);
    assert.equal(r.next(), 7);
  });
  it('toggleMode switches between modes and keeps both states', () => {
    const r = new Reader(TOTAL, new MemoryStore(42), 'continuous', counter());
    assert.equal(r.toggleMode(), 'random');
    const shown = r.current();
    assert.equal(r.toggleMode(), 'continuous');
    assert.equal(r.current(), 42);
    r.toggleMode();
    assert.equal(r.current(), shown);
  });
});

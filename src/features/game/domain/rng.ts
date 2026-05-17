export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
}

export function createRng(seed: number | string): Rng {
  let state = normalizeSeed(seed);

  const next = (): number => {
    state = mulberry32(state);
    return (state >>> 0) / 0xffffffff;
  };

  return {
    next,
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error("Rng.pick: empty array");
      }
      const value = items[Math.floor(next() * items.length)];
      if (value === undefined) {
        throw new Error("Rng.pick: out of bounds");
      }
      return value;
    },
    pickWeighted(items, weights) {
      if (items.length === 0 || items.length !== weights.length) {
        throw new Error("Rng.pickWeighted: invalid input");
      }
      let total = 0;
      for (const w of weights) total += w;
      if (total <= 0) {
        throw new Error("Rng.pickWeighted: non-positive total");
      }
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i] ?? 0;
        if (r <= 0) {
          const value = items[i];
          if (value === undefined) {
            throw new Error("Rng.pickWeighted: out of bounds");
          }
          return value;
        }
      }
      const last = items[items.length - 1];
      if (last === undefined) {
        throw new Error("Rng.pickWeighted: out of bounds");
      }
      return last;
    },
  };
}

function normalizeSeed(seed: number | string): number {
  if (typeof seed === "number") return seed >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): number {
  let t = (a + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

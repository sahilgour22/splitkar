import { splitEqually, splitByPercentage, splitByShares } from '@/utils/splits';

// helper: sum a bigint array
const sum = (arr: bigint[]) => arr.reduce((a, b) => a + b, 0n);

// ─── splitEqually ─────────────────────────────────────────────────────────────

describe('splitEqually', () => {
  it('splits evenly when divisible', () => {
    expect(splitEqually(300n, 3)).toEqual([100n, 100n, 100n]);
  });

  it('gives first participant extra paise when not divisible (100 ÷ 3)', () => {
    expect(splitEqually(100n, 3)).toEqual([34n, 33n, 33n]);
  });

  it('distributes single extra paise only to first participant', () => {
    const result = splitEqually(7n, 3);
    expect(result).toEqual([3n, 2n, 2n]);
  });

  it('handles single participant', () => {
    expect(splitEqually(999n, 1)).toEqual([999n]);
  });

  it('handles two participants evenly', () => {
    expect(splitEqually(100n, 2)).toEqual([50n, 50n]);
  });

  it('handles two participants with remainder', () => {
    expect(splitEqually(101n, 2)).toEqual([51n, 50n]);
  });

  it('returns empty array for zero participants', () => {
    expect(splitEqually(100n, 0)).toEqual([]);
  });

  it('returns empty array for negative participant count', () => {
    expect(splitEqually(100n, -5)).toEqual([]);
  });

  it('returns zeros for zero total', () => {
    expect(splitEqually(0n, 3)).toEqual([0n, 0n, 0n]);
  });

  it('returns zeros for negative total', () => {
    expect(splitEqually(-100n, 3)).toEqual([0n, 0n, 0n]);
  });

  it('always sums to totalPaise — 101 ÷ 3', () => {
    const result = splitEqually(101n, 3);
    expect(sum(result)).toBe(101n);
  });

  it('always sums to totalPaise — 1000000 ÷ 7', () => {
    const result = splitEqually(1000000n, 7);
    expect(sum(result)).toBe(1000000n);
  });

  it('handles more participants than paise (1 paise ÷ 3)', () => {
    const result = splitEqually(1n, 3);
    expect(result).toEqual([1n, 0n, 0n]);
    expect(sum(result)).toBe(1n);
  });

  it('handles 3 paise ÷ 7 participants', () => {
    const result = splitEqually(3n, 7);
    expect(result).toEqual([1n, 1n, 1n, 0n, 0n, 0n, 0n]);
    expect(sum(result)).toBe(3n);
  });

  it('handles 100 participants each getting 1 paise', () => {
    const result = splitEqually(100n, 100);
    expect(result).toHaveLength(100);
    expect(result.every((v) => v === 1n)).toBe(true);
  });

  it('handles large amounts correctly', () => {
    const result = splitEqually(1_000_000_00n, 3); // 1 crore paise
    expect(sum(result)).toBe(1_000_000_00n);
  });
});

// ─── splitByPercentage ────────────────────────────────────────────────────────

describe('splitByPercentage', () => {
  it('handles empty array', () => {
    expect(splitByPercentage(100n, [])).toEqual([]);
  });

  it('returns zeros for zero total', () => {
    expect(splitByPercentage(0n, [50, 50])).toEqual([0n, 0n]);
  });

  it('splits 50/50', () => {
    expect(splitByPercentage(100n, [50, 50])).toEqual([50n, 50n]);
  });

  it('splits 100% single participant', () => {
    expect(splitByPercentage(100n, [100])).toEqual([100n]);
  });

  it('splits 10/20/70', () => {
    expect(splitByPercentage(300n, [10, 20, 70])).toEqual([30n, 60n, 210n]);
  });

  it('handles 33.33/33.33/33.34 — sums to total', () => {
    const result = splitByPercentage(300n, [33.33, 33.33, 33.34]);
    expect(sum(result)).toBe(300n);
  });

  it('33.33%×3 on 100 paise: largest-remainder resolves extra paise', () => {
    // 33.33 * 100 / 100 = 33.33 each → floor=33 each → leftover=1
    // frac all equal at 0.33, tie broken by index → [34n, 33n, 33n]
    const result = splitByPercentage(100n, [33.33, 33.33, 33.33]);
    expect(sum(result)).toBe(100n);
    expect(result[0]!).toBeGreaterThanOrEqual(result[1]!);
  });

  it('always sums to totalPaise — 999 paise with 33.33/33.33/33.34', () => {
    const result = splitByPercentage(999n, [33.33, 33.33, 33.34]);
    expect(sum(result)).toBe(999n);
  });

  it('25/25/25/25 splits evenly', () => {
    expect(splitByPercentage(100n, [25, 25, 25, 25])).toEqual([25n, 25n, 25n, 25n]);
  });

  it('handles 1 paise with 50/50 — largest remainder gives it to first', () => {
    // raw=[0.5, 0.5], floor=[0n, 0n], leftover=1, tie→first by index
    const result = splitByPercentage(1n, [50, 50]);
    expect(result).toEqual([1n, 0n]);
    expect(sum(result)).toBe(1n);
  });

  it('handles 7 paise with 50/50', () => {
    // raw=[3.5, 3.5], floor=[3, 3], leftover=1, tie→first
    const result = splitByPercentage(7n, [50, 50]);
    expect(result).toEqual([4n, 3n]);
    expect(sum(result)).toBe(7n);
  });

  it('10 equal participants at 10% each', () => {
    const pcts = Array(10).fill(10);
    const result = splitByPercentage(100n, pcts);
    expect(result).toEqual(Array(10).fill(10n));
    expect(sum(result)).toBe(100n);
  });

  it('large amount 50/50 stays exact', () => {
    const result = splitByPercentage(1_000_000_000n, [50, 50]);
    expect(result).toEqual([500_000_000n, 500_000_000n]);
    expect(sum(result)).toBe(1_000_000_000n);
  });

  it('sums to total across many small percentages', () => {
    // 11 participants, first gets 10%, rest get 9% each (10 + 90 = 100)
    const pcts = [10, ...Array(10).fill(9)];
    const result = splitByPercentage(100n, pcts);
    expect(sum(result)).toBe(100n);
  });

  it('handles tiny percentage (0.01% of 100 paise)', () => {
    // 0.01% * 100 = 0.01 paise → floor=0, rest (99.99%) gets the paise
    const result = splitByPercentage(100n, [0.01, 99.99]);
    expect(sum(result)).toBe(100n);
    expect(result[1]!).toBeGreaterThan(result[0]!);
  });
});

// ─── splitByShares ────────────────────────────────────────────────────────────

describe('splitByShares', () => {
  it('handles empty array', () => {
    expect(splitByShares(100n, [])).toEqual([]);
  });

  it('returns zeros for zero total', () => {
    expect(splitByShares(0n, [1, 2])).toEqual([0n, 0n]);
  });

  it('returns zeros when all shares are zero', () => {
    expect(splitByShares(100n, [0, 0])).toEqual([0n, 0n]);
  });

  it('handles single participant with all shares', () => {
    expect(splitByShares(100n, [1])).toEqual([100n]);
  });

  it('splits 1/2/3 correctly', () => {
    expect(splitByShares(600n, [1, 2, 3])).toEqual([100n, 200n, 300n]);
  });

  it('splits equal shares 1/1', () => {
    expect(splitByShares(100n, [1, 1])).toEqual([50n, 50n]);
  });

  it('splits equal shares 1/1/1', () => {
    expect(splitByShares(99n, [1, 1, 1])).toEqual([33n, 33n, 33n]);
  });

  it('handles 7 paise with equal shares — largest remainder resolves', () => {
    // raw=[3.5, 3.5], floor=[3, 3], leftover=1, tie→first
    const result = splitByShares(7n, [1, 1]);
    expect(result).toEqual([4n, 3n]);
    expect(sum(result)).toBe(7n);
  });

  it('1:2 ratio on 100 paise', () => {
    // 33.33 / 66.67
    const result = splitByShares(100n, [1, 2]);
    expect(sum(result)).toBe(100n);
    expect(result[1]!).toBeGreaterThan(result[0]!);
  });

  it('always sums to totalPaise — 999 ÷ 3 equal shares', () => {
    const result = splitByShares(999n, [1, 1, 1]);
    expect(sum(result)).toBe(999n);
    expect(result).toEqual([333n, 333n, 333n]);
  });

  it('proportional weights: 3/3/3 same as equal split', () => {
    const byShares = splitByShares(100n, [3, 3, 3]);
    const equal = splitByShares(100n, [1, 1, 1]);
    expect(byShares).toEqual(equal);
  });

  it('sums correctly for 7 participants at 1000000 paise', () => {
    const result = splitByShares(1_000_000n, [1, 1, 1, 1, 1, 1, 1]);
    expect(sum(result)).toBe(1_000_000n);
  });

  it('1/2/3/4 totalling 10 shares divides 10 paise perfectly', () => {
    const result = splitByShares(10n, [1, 2, 3, 4]);
    expect(result).toEqual([1n, 2n, 3n, 4n]);
    expect(sum(result)).toBe(10n);
  });

  it('2/1 ratio on 3 paise', () => {
    const result = splitByShares(3n, [2, 1]);
    expect(result).toEqual([2n, 1n]);
    expect(sum(result)).toBe(3n);
  });

  it('large weight imbalance: 99/1 on 100 paise', () => {
    const result = splitByShares(100n, [99, 1]);
    expect(result).toEqual([99n, 1n]);
    expect(sum(result)).toBe(100n);
  });
});

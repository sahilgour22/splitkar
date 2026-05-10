/**
 * Pure split-calculation utilities.
 *
 * All inputs/outputs are BIGINT paise.  The largest-remainder method is used
 * throughout so that SUM(result) === totalPaise exactly.
 *
 * IMPORTANT: These functions may return 0n for some participants (e.g. when
 * totalPaise < participantCount in an equal split).  The calling code MUST
 * filter out zero-amount entries before passing splits to the DB because the
 * expense_splits table has CHECK (amount > 0).
 */

// ─── equal ────────────────────────────────────────────────────────────────────

/**
 * Distribute totalPaise evenly across participantCount participants.
 * The first `totalPaise % participantCount` participants each get one extra paise.
 *
 * @example splitEqually(100n, 3) → [34n, 33n, 33n]
 */
export function splitEqually(totalPaise: bigint, participantCount: number): bigint[] {
  if (participantCount <= 0) return [];
  if (totalPaise <= 0n) return Array(participantCount).fill(0n);

  const base = totalPaise / BigInt(participantCount);
  const remainder = Number(totalPaise % BigInt(participantCount));

  return Array.from({ length: participantCount }, (_, i) => (i < remainder ? base + 1n : base));
}

// ─── helpers shared by percentage + shares ────────────────────────────────────

/**
 * Given raw (float) paise values per participant, floor them, then distribute
 * the leftover paise using the largest-remainder method (highest fractional
 * parts first; ties broken by earlier index).
 */
function largestRemainder(rawValues: number[], totalPaise: bigint): bigint[] {
  const floored = rawValues.map((v) => BigInt(Math.trunc(v)));
  const totalFloored = floored.reduce((a, b) => a + b, 0n);
  const leftover = Number(totalPaise - totalFloored);

  if (leftover === 0) return floored;

  // Sort by descending fractional part; stable tie-break by original index
  const fracs = rawValues.map((v, i) => ({ i, frac: v - Math.trunc(v) }));
  fracs.sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  const n = rawValues.length;

  // When percentages don't sum to 100%, leftover can exceed n.
  // Distribute full rounds evenly first, then largest-remainder for the rest.
  const fullRounds = Math.floor(leftover / n);
  const fracRemainder = leftover % n;

  if (fullRounds > 0) {
    for (let i = 0; i < n; i++) result[i]! += BigInt(fullRounds);
  }
  for (let k = 0; k < fracRemainder; k++) {
    result[fracs[k]!.i]! += 1n;
  }
  return result;
}

// ─── percentage ───────────────────────────────────────────────────────────────

/**
 * Convert percentage allocations to paise amounts.
 * percentages[i] is a number like 33.33 (not 0.3333).
 * They need not sum to exactly 100 before calling; the largest-remainder step
 * absorbs any floating-point slop so SUM(result) === totalPaise.
 *
 * @example splitByPercentage(300n, [33.33, 33.33, 33.34]) → [100n, 100n, 100n]
 */
export function splitByPercentage(totalPaise: bigint, percentages: number[]): bigint[] {
  if (percentages.length === 0) return [];
  if (totalPaise <= 0n) return percentages.map(() => 0n);

  const total = Number(totalPaise);
  const raw = percentages.map((p) => (total * p) / 100);
  return largestRemainder(raw, totalPaise);
}

// ─── shares ───────────────────────────────────────────────────────────────────

/**
 * Distribute totalPaise proportionally according to share weights.
 *
 * @example splitByShares(600n, [1, 2, 3]) → [100n, 200n, 300n]
 */
export function splitByShares(totalPaise: bigint, shares: number[]): bigint[] {
  if (shares.length === 0) return [];
  if (totalPaise <= 0n) return shares.map(() => 0n);

  const totalShares = shares.reduce((a, b) => a + b, 0);
  if (totalShares <= 0) return shares.map(() => 0n);

  const total = Number(totalPaise);
  const raw = shares.map((s) => (total * s) / totalShares);
  return largestRemainder(raw, totalPaise);
}

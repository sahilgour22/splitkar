/**
 * Greedy debt simplification.
 *
 * Reduces N raw pairwise debts to the minimum number of transfers needed to
 * settle a group. Uses net-balance aggregation then greedy matching of the
 * largest creditor with the largest debtor.
 *
 * All amounts are in paise (BIGINT) — never floats.
 * Deterministic: ties broken by user_id lexicographic order.
 */

export interface Debt {
  debtor_id: string;
  creditor_id: string;
  amount: bigint;
}

interface BalanceNode {
  id: string;
  amount: bigint; // always positive; direction determined by which list it's in
}

function descendingByAmount(a: BalanceNode, b: BalanceNode): number {
  if (b.amount > a.amount) return 1;
  if (b.amount < a.amount) return -1;
  return a.id.localeCompare(b.id); // deterministic tie-break
}

export function simplifyDebts(rawDebts: Debt[]): Debt[] {
  if (rawDebts.length === 0) return [];

  // Build net balance per user: positive = creditor, negative = debtor
  const net = new Map<string, bigint>();
  for (const { debtor_id, creditor_id, amount } of rawDebts) {
    net.set(debtor_id, (net.get(debtor_id) ?? 0n) - amount);
    net.set(creditor_id, (net.get(creditor_id) ?? 0n) + amount);
  }

  const creditors: BalanceNode[] = [];
  const debtors: BalanceNode[] = [];

  // Sort map iteration for determinism
  for (const [id, balance] of [...net.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (balance > 0n) creditors.push({ id, amount: balance });
    else if (balance < 0n) debtors.push({ id, amount: -balance });
  }

  creditors.sort(descendingByAmount);
  debtors.sort(descendingByAmount);

  const result: Debt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;

    const settle = creditor.amount < debtor.amount ? creditor.amount : debtor.amount;

    result.push({ debtor_id: debtor.id, creditor_id: creditor.id, amount: settle });

    creditor.amount -= settle;
    debtor.amount -= settle;

    if (creditor.amount === 0n) ci++;
    if (debtor.amount === 0n) di++;
  }

  return result;
}

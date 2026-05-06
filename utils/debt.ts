/**
 * Greedy debt simplification — see docs/debt-simplification.md for full spec.
 * Input: raw pairwise debts from compute_balances() RPC (amounts in paise).
 * Output: minimum set of transfers to clear all debts.
 */

export interface RawDebt {
  debtorId: string;
  creditorId: string;
  amount: number; // paise
}

export interface Transfer {
  from: string;
  to: string;
  amount: number; // paise
}

interface BalanceEntry {
  id: string;
  amount: number; // always positive
}

function insertSorted(arr: BalanceEntry[], item: BalanceEntry): void {
  const idx = arr.findIndex((x) => x.amount < item.amount);
  arr.splice(idx === -1 ? arr.length : idx, 0, item);
}

export function simplifyDebts(rawDebts: RawDebt[]): Transfer[] {
  const net = new Map<string, number>();

  for (const { debtorId, creditorId, amount } of rawDebts) {
    net.set(debtorId, (net.get(debtorId) ?? 0) - amount);
    net.set(creditorId, (net.get(creditorId) ?? 0) + amount);
  }

  const creditors: BalanceEntry[] = [];
  const debtors: BalanceEntry[] = [];

  for (const [id, balance] of net) {
    if (balance > 0) insertSorted(creditors, { id, amount: balance });
    if (balance < 0) insertSorted(debtors, { id, amount: -balance });
  }

  const result: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors.shift()!;
    const debtor = debtors.shift()!;

    const settle = Math.min(creditor.amount, debtor.amount);
    result.push({ from: debtor.id, to: creditor.id, amount: settle });

    const remCredit = creditor.amount - settle;
    const remDebt = debtor.amount - settle;

    if (remCredit > 0) insertSorted(creditors, { id: creditor.id, amount: remCredit });
    if (remDebt > 0) insertSorted(debtors, { id: debtor.id, amount: remDebt });
  }

  return result;
}

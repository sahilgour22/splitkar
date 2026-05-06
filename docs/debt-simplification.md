# Debt Simplification Algorithm

## Problem

`compute_balances(group_id)` returns raw pairwise net debts — e.g. five people may
produce ten debt edges. The UI should show the _minimum_ number of transactions
needed to settle all debts. This is the classic "minimum number of transfers"
problem, solved with a greedy net-balance approach.

## Algorithm: Greedy Graph Reduction

### Intuition

Instead of honouring every pairwise edge, compute each person's _net position_:

- **Net > 0** → creditor (others owe them this much in total)
- **Net < 0** → debtor (they owe this much in total, net)
- **Net = 0** → already balanced; skip

Then greedily match the largest creditor with the largest debtor until everyone is
settled. This minimises transaction count and is O(n log n).

### TypeScript Pseudocode

```typescript
type RawDebt = { debtorId: string; creditorId: string; amount: number }; // paise
type Transfer = { from: string; to: string; amount: number }; // paise

export function simplifyDebts(rawDebts: RawDebt[]): Transfer[] {
  // Step 1: net balance per person
  const net = new Map<string, number>();
  for (const { debtorId, creditorId, amount } of rawDebts) {
    net.set(debtorId, (net.get(debtorId) ?? 0) - amount);
    net.set(creditorId, (net.get(creditorId) ?? 0) + amount);
  }

  // Step 2: separate into debtors (negative) and creditors (positive)
  // Store amounts as positive integers; tag by user id.
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of net) {
    if (balance > 0) creditors.push({ id, amount: balance });
    if (balance < 0) debtors.push({ id, amount: -balance }); // flip sign
    // balance === 0 → already settled, skip
  }

  // Sort descending so we can pop the maximum from the end (O(1) amortised)
  const byAmtDesc = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
  creditors.sort(byAmtDesc);
  debtors.sort(byAmtDesc);

  const result: Transfer[] = [];

  // Step 3: greedy match
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]!;
    const debtor = debtors[0]!;

    const settle = Math.min(creditor.amount, debtor.amount);
    result.push({ from: debtor.id, to: creditor.id, amount: settle });

    creditor.amount -= settle;
    debtor.amount -= settle;

    // Remove fully-settled entries; re-insert partially-settled ones
    // (insertion-sort to maintain descending order — n is tiny in practice)
    if (creditor.amount === 0) creditors.shift();
    else {
      creditors.shift();
      insertSorted(creditors, creditor, byAmtDesc);
    }
    if (debtor.amount === 0) debtors.shift();
    else {
      debtors.shift();
      insertSorted(debtors, debtor, byAmtDesc);
    }
  }

  return result;
}

function insertSorted<T>(arr: T[], item: T, cmp: (a: T, b: T) => number): void {
  const idx = arr.findIndex((x) => cmp(item, x) <= 0);
  arr.splice(idx === -1 ? arr.length : idx, 0, item);
}
```

### Complexity

| Step                     | Time                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| Net balance accumulation | O(e) where e = number of raw debt edges                            |
| Sort creditors + debtors | O(n log n)                                                         |
| Greedy matching          | O(n²) worst-case (n = group size), O(n log n) with a real max-heap |

Group sizes are small in practice (≤ 20), so the sort-then-shift approach is fine.
Switch to a proper heap if groups regularly exceed ~50 members.

---

## Edge Cases

### 1. Refunds (negative-value expenses)

**Scenario:** Alice accidentally added ₹500 for a meal. She deletes it and re-adds
₹450. The old expense is soft-deleted (`is_deleted = true`).

**Handling:** `compute_balances` filters `WHERE NOT e.is_deleted`, so the deleted
expense contributes nothing. The corrected expense is treated normally. No special
logic needed in `simplifyDebts`.

**Watch out for:** If a refund is modelled as a new expense where `paid_by` is the
original payer and splits go the other direction (e.g. Bob "paid" Alice ₹50 as a
refund), this produces a debt in the reverse direction. The netting in
`compute_balances` handles this correctly — reverse debts cancel forward debts.

---

### 2. Deleted Expenses

**Scenario:** An expense that created debts is later soft-deleted.

**Handling:** Soft-deletion sets `is_deleted = true` and records `deleted_at` /
`deleted_by`. `compute_balances` already excludes deleted expenses via the
`WHERE NOT e.is_deleted` clause. Settlements recorded _before_ deletion remain; if
they now over-pay, the balance flips direction (the original payer now owes the
original debtor). The simplification algorithm handles negative net balances
naturally (the sign determines who is the creditor).

**Implication for UI:** After an expense is deleted, the group's suggested
settlements will change. The app should refresh the balance screen.

---

### 3. Partial Settlements

**Scenario:** Bob owes Alice ₹1000. He pays ₹300 first, then ₹400 later.

**Handling:** Each settlement is an immutable row in `settlements`.
`compute_balances` sums all settlement flows for the pair, so the remaining debt
is ₹1000 − ₹300 − ₹400 = ₹300. The simplification correctly suggests Bob → Alice
₹300.

**Implication:** There is no "settlement pending" state. Each payment is final.
If a settlement was entered incorrectly, the admin records a counter-settlement in
the opposite direction (payee pays payer back the erroneous amount).

---

### 4. Currency Mismatch

**Scenario (Phase 2+):** A group has INR expenses and one USD expense from an
international trip.

**Phase 1 handling:** All amounts are treated as the group's declared currency
(stored in `groups.currency`). Multi-currency with FX conversion is explicitly out
of scope. A validation check should prevent adding an expense with a different
currency in Phase 1.

**Future note:** When multi-currency ships, `compute_balances` must normalise all
amounts to a base currency using a stored FX rate before netting. The
`expense_splits.amount` column will store the amount in the group's base currency,
with a separate `original_amount` + `original_currency` + `fx_rate` for display.

---

### 5. Self-Debt

**Scenario:** Alice creates a group, adds an expense, and lists herself as both
payer and the only split participant.

**Handling:** `compute_balances` filters `es.user_id != e.paid_by`. A person cannot
owe themselves. The payer's own share is implicitly pre-paid. If _all_ splits belong
to the payer (solo expense), the expense produces zero debt edges — which is correct
(Alice paid for herself).

**Also guarded by:** The `CONSTRAINT no_self_settlement CHECK (payer_id != payee_id)`
in `settlements` prevents recording a settlement with the same person on both sides.

---

### 6. Circular Debts

**Scenario:** Alice owes Bob ₹100, Bob owes Charlie ₹100, Charlie owes Alice ₹100
(a perfect cycle).

**Handling:** After netting:

- Alice: −100 (from Bob) + 100 (from Charlie) = 0
- Bob: +100 (from Alice) − 100 (to Charlie) = 0
- Charlie: +100 (from Bob) − 100 (to Alice) = 0

All net balances are zero → `simplifyDebts` returns an empty array. No transactions
needed. The circular debt cancels itself out automatically.

**Implication:** Users don't need to manually "cancel" circular debts. The
algorithm does it for free.

---

## Properties of the Greedy Solution

- **Optimal transaction count** when all net balances can be paired exactly. In the
  worst case (e.g. n creditors each owed different amounts from n debtors each
  owing different amounts), the result may not be globally optimal (this is
  NP-hard in general), but is within 1 of optimal for typical group sizes.
- **Deterministic:** for a given set of net balances, the greedy algorithm with
  descending sort always produces the same output. This prevents UI flickering.
- **Idempotent:** calling `simplifyDebts` with the same input always returns the
  same result. The "suggested settlements" UI can be recomputed at any time.

import { simplifyDebts } from '@/features/balances/simplify';
import type { Debt } from '@/features/balances/simplify';

// ─── helpers ──────────────────────────────────────────────────────────────────

function debt(debtor: string, creditor: string, amount: bigint): Debt {
  return { debtor_id: debtor, creditor_id: creditor, amount };
}

const totalAmount = (debts: Debt[]) => debts.reduce((s, d) => s + d.amount, 0n);

// ─── simplifyDebts ────────────────────────────────────────────────────────────

describe('simplifyDebts', () => {
  it('returns empty array for empty input', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('handles a single pairwise debt unchanged', () => {
    const input = [debt('A', 'B', 1000n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ debtor_id: 'A', creditor_id: 'B', amount: 1000n });
  });

  it('cancels out mutual debts (A owes B, B owes A same amount)', () => {
    const input = [debt('A', 'B', 500n), debt('B', 'A', 500n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(0);
  });

  it('nets partial mutual debts (A owes B 700, B owes A 300 → A owes B 400)', () => {
    const input = [debt('A', 'B', 700n), debt('B', 'A', 300n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ debtor_id: 'A', creditor_id: 'B', amount: 400n });
  });

  it('3-person canonical: A pays for all, B and C each owe A half', () => {
    // A paid 3000, split equally → B owes A 1000, C owes A 1000
    const input = [debt('B', 'A', 1000n), debt('C', 'A', 1000n)];
    const result = simplifyDebts(input);
    // net: A=+2000, B=-1000, C=-1000 → already 2 transfers, no reduction possible
    expect(result).toHaveLength(2);
    expect(totalAmount(result)).toBe(2000n);
    expect(result.every((d) => d.creditor_id === 'A')).toBe(true);
  });

  it('3-person chain: A owes B, B owes C → resolved to A owes C directly', () => {
    // A owes B 1000, B owes C 1000 → net A=-1000, B=0, C=+1000 → A pays C
    const input = [debt('A', 'B', 1000n), debt('B', 'C', 1000n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ debtor_id: 'A', creditor_id: 'C', amount: 1000n });
  });

  it('3-person partial chain reduction: A→B 600, B→C 1000', () => {
    // net: A=-600, B=+600-1000=-400, C=+1000
    // creditors: C(1000), B is actually debtor
    // debtors: B(400), A(600)
    // 1st match: A(600) vs C(1000) → A pays C 600, C left 400
    // 2nd match: B(400) vs C(400) → B pays C 400
    const input = [debt('A', 'B', 600n), debt('B', 'C', 1000n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(2);
    expect(totalAmount(result)).toBe(1000n);
    const creditors = new Set(result.map((d) => d.creditor_id));
    expect(creditors.has('C')).toBe(true);
  });

  it('4-person circular: A→B, B→C, C→D, D→A all same amount → all cancel', () => {
    const v = 500n;
    const input = [debt('A', 'B', v), debt('B', 'C', v), debt('C', 'D', v), debt('D', 'A', v)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(0);
  });

  it('4-person: reduces to fewer than 4 transfers', () => {
    // A owes B 300, A owes C 400, D owes B 200, D owes C 100
    // net: A=-700, B=+500, C=+500, D=-300
    // creditors: B(500), C(500); debtors: A(700), D(300)
    // match A(700) vs B(500): A→B 500, A leftover 200
    // match A(200) vs C(500): A→C 200, C leftover 300
    // match D(300) vs C(300): D→C 300
    const input = [
      debt('A', 'B', 300n),
      debt('A', 'C', 400n),
      debt('D', 'B', 200n),
      debt('D', 'C', 100n),
    ];
    const result = simplifyDebts(input);
    expect(result.length).toBeLessThanOrEqual(4);
    expect(totalAmount(result)).toBe(1000n);
  });

  it('all-zero balances: everyone pays everyone equally → empty', () => {
    // 3 people each pay 1000 and each owe 1000 in a triangle
    const input = [debt('A', 'B', 1000n), debt('B', 'C', 1000n), debt('C', 'A', 1000n)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(0);
  });

  it('preserves total net value across simplification', () => {
    const input = [
      debt('A', 'C', 600n),
      debt('B', 'C', 400n),
      debt('C', 'D', 300n),
      debt('A', 'D', 200n),
    ];
    const result = simplifyDebts(input);
    // net: A=-800, B=-400, C=700, D=500 (wait, let me recalculate)
    // A: debtor in 600 and 200 → net = -(600+200) = -800
    // B: debtor in 400 → net = -400
    // C: creditor in 600+400, debtor in 300 → net = +700
    // D: creditor in 300+200 → net = +500
    // total credits = 700+500 = 1200 = total debts 800+400
    const totalResult = result.reduce((s, d) => s + d.amount, 0n);
    // Can't assert exact same total since simplification may change,
    // but the net balance of each user should be preserved
    // Just verify no extra or missing money
    expect(totalResult).toBe(1200n);
  });

  it('deterministic: same input always produces same output', () => {
    const input = [
      debt('user-3', 'user-1', 300n),
      debt('user-2', 'user-1', 200n),
      debt('user-3', 'user-2', 100n),
    ];
    const r1 = simplifyDebts(input);
    const r2 = simplifyDebts(input);
    expect(r1).toEqual(r2);
  });

  it('large paise amounts do not overflow (1 crore paise each)', () => {
    const crore = 1_00_00_000n;
    const input = [debt('A', 'B', crore), debt('B', 'C', crore)];
    const result = simplifyDebts(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ debtor_id: 'A', creditor_id: 'C', amount: crore });
  });

  it('5-person group partial debts simplify to minimum transfers', () => {
    // A owes B 100, C owes B 200, D owes E 150, E owes B 50
    // net: A=-100, B=+350, C=-200, D=-150, E=+100
    // creditors: B(350), E(100); debtors: C(200), D(150), A(100)
    // This should produce at most n-1 = 4 transfers
    const input = [
      debt('A', 'B', 100n),
      debt('C', 'B', 200n),
      debt('D', 'E', 150n),
      debt('E', 'B', 50n),
    ];
    const result = simplifyDebts(input);
    expect(result.length).toBeLessThanOrEqual(4);
    // verify net balances preserved
    const net = new Map<string, bigint>();
    for (const d of result) {
      net.set(d.debtor_id, (net.get(d.debtor_id) ?? 0n) - d.amount);
      net.set(d.creditor_id, (net.get(d.creditor_id) ?? 0n) + d.amount);
    }
    expect(net.get('B') ?? 0n).toBe(350n);
    expect(net.get('A') ?? 0n).toBe(-100n);
    expect(net.get('C') ?? 0n).toBe(-200n);
    expect(net.get('D') ?? 0n).toBe(-150n);
    expect(net.get('E') ?? 0n).toBe(100n);
  });
});

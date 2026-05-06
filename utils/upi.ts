/**
 * UPI deep-link builder for INR payments.
 * Spec: https://www.npci.org.in/PDF/npci/upi/circular-and-guidelines/Annexure-1-UPI-Link-Specification-ver-1.2.1.pdf
 */

export interface UpiParams {
  pa: string; // payee VPA (e.g. "user@upi")
  pn: string; // payee name
  am: number; // amount in paise — converted to rupees for the link
  tn?: string; // transaction note
  tr?: string; // transaction reference / merchant order id
  cu?: string; // currency (default INR)
}

/** Returns a upi:// deep link string. Opens any installed UPI app on Android. */
export function buildUpiLink({ pa, pn, am, tn, tr, cu = 'INR' }: UpiParams): string {
  const rupees = (am / 100).toFixed(2);
  const params = new URLSearchParams({
    pa,
    pn,
    am: rupees,
    cu,
    ...(tn ? { tn } : {}),
    ...(tr ? { tr } : {}),
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Money utilities.
 * Rule: all amounts stored on the server as BIGINT paise (1 INR = 100 paise).
 * Display-layer converts paise → INR string.
 *
 * CONVENTION: Never call .toString() on a raw paise amount in UI code.
 * Always pass it through formatMoney() so formatting is consistent.
 */

/** Convert a rupee float from user input to integer paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert server paise to a display rupee number. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

/**
 * Format a paise amount as a localised currency string.
 *
 * INR uses the Indian numbering system (lakhs/crores):
 *   formatMoney(12345678n, 'INR') → "₹1,23,456.78"
 *
 * Other currencies use standard locale formatting via Intl.NumberFormat.
 *
 * Accepts both bigint (DB values) and number (legacy/intermediate values).
 */
export function formatMoney(amountPaise: bigint | number, currency = 'INR'): string {
  const paise = typeof amountPaise === 'bigint' ? Number(amountPaise) : amountPaise;
  const amount = paise / 100;

  try {
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * @deprecated Use formatMoney instead.
 * Kept for backward compatibility with existing callers.
 */
export function formatCurrency(paise: number, currency = 'INR'): string {
  return formatMoney(paise, currency);
}

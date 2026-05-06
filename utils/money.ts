/**
 * Money utilities.
 * Rule: all amounts stored on the server as BIGINT paise (1 INR = 100 paise).
 * Display-layer converts paise → INR string.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Convert a rupee float from user input to integer paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert server paise to a display rupee number. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

/** Format paise as a localised currency string. */
export function formatCurrency(paise: number, currency = 'INR'): string {
  const amount = fromPaise(paise);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

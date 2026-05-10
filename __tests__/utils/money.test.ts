import { formatMoney, toPaise, fromPaise } from '@/utils/money';

describe('toPaise', () => {
  it('converts whole rupees', () => expect(toPaise(1)).toBe(100));
  it('converts decimal rupees', () => expect(toPaise(1.5)).toBe(150));
  it('converts paise fractions', () => expect(toPaise(0.01)).toBe(1));
  it('rounds fractional paise', () => expect(toPaise(0.005)).toBe(1));
  it('handles zero', () => expect(toPaise(0)).toBe(0));
});

describe('fromPaise', () => {
  it('converts paise to rupees', () => expect(fromPaise(100)).toBe(1));
  it('converts fractional amounts', () => expect(fromPaise(50)).toBe(0.5));
  it('handles zero', () => expect(fromPaise(0)).toBe(0));
});

describe('formatMoney — INR Indian numbering', () => {
  it('formats zero', () => {
    const result = formatMoney(0, 'INR');
    expect(result).toMatch(/0\.00/);
  });

  it('formats 1 paise', () => {
    const result = formatMoney(1, 'INR');
    expect(result).toMatch(/0\.01/);
  });

  it('formats 100 paise as ₹1', () => {
    const result = formatMoney(100, 'INR');
    expect(result).toMatch(/1\.00/);
  });

  it('formats 99 paise as ₹0.99', () => {
    const result = formatMoney(99, 'INR');
    expect(result).toMatch(/0\.99/);
  });

  it('formats 100000 paise as ₹1,000', () => {
    const result = formatMoney(100000, 'INR');
    expect(result).toMatch(/1,000\.00/);
  });

  it('formats lakh amount with Indian grouping (en-IN: ₹1,00,000)', () => {
    // 10000000 paise = ₹1,00,000
    const result = formatMoney(10000000, 'INR');
    // Indian style: 1,00,000
    expect(result).toMatch(/1,00,000/);
  });

  it('formats crore amount with Indian grouping', () => {
    // 1000000000 paise = ₹1,00,00,000
    const result = formatMoney(1000000000, 'INR');
    expect(result).toMatch(/1,00,00,000/);
  });

  it('accepts bigint input', () => {
    const result = formatMoney(12345678n, 'INR');
    // 12345678 paise = ₹1,23,456.78
    expect(result).toMatch(/1,23,456\.78/);
  });

  it('includes ₹ currency symbol', () => {
    const result = formatMoney(100, 'INR');
    expect(result).toContain('₹');
  });
});

describe('formatMoney — other currencies', () => {
  it('formats USD', () => {
    const result = formatMoney(100, 'USD');
    expect(result).toMatch(/\$1\.00/);
  });

  it('formats USD large amount with standard grouping', () => {
    const result = formatMoney(1000000, 'USD');
    expect(result).toMatch(/10,000\.00/);
  });

  it('falls back for unknown currency code', () => {
    const result = formatMoney(100, 'XYZ');
    expect(result).toContain('XYZ');
    expect(result).toContain('1.00');
  });

  it('formats EUR', () => {
    const result = formatMoney(100, 'EUR');
    // €1.00 — symbol placement is locale-dependent but amount must be present
    expect(result).toMatch(/1\.00/);
  });

  it('accepts bigint for non-INR currencies', () => {
    const result = formatMoney(500n, 'USD');
    expect(result).toMatch(/5\.00/);
  });
});

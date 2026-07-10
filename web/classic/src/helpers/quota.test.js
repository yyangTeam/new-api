import { getQuotaPerUnit, quotaToDisplayAmount, displayAmountToQuota } from './quota';

vi.mock('./render', () => ({
  getCurrencyConfig: vi.fn(),
}));

import { getCurrencyConfig } from './render';

beforeEach(() => {
  localStorage.clear();
  getCurrencyConfig.mockReturnValue({ type: 'USD', rate: 1, symbol: '$' });
});

describe('getQuotaPerUnit', () => {
  test('returns 1 when localStorage has no value', () => {
    expect(getQuotaPerUnit()).toBe(1);
  });

  test('returns parsed value from localStorage', () => {
    localStorage.setItem('quota_per_unit', '500000');
    expect(getQuotaPerUnit()).toBe(500000);
  });

  test('returns 1 for invalid value', () => {
    localStorage.setItem('quota_per_unit', 'abc');
    expect(getQuotaPerUnit()).toBe(1);
  });

  test('returns 1 for zero', () => {
    localStorage.setItem('quota_per_unit', '0');
    expect(getQuotaPerUnit()).toBe(1);
  });

  test('returns 1 for negative value', () => {
    localStorage.setItem('quota_per_unit', '-100');
    expect(getQuotaPerUnit()).toBe(1);
  });

  test('returns parsed float', () => {
    localStorage.setItem('quota_per_unit', '2.5');
    expect(getQuotaPerUnit()).toBe(2.5);
  });
});

describe('quotaToDisplayAmount', () => {
  beforeEach(() => {
    localStorage.setItem('quota_per_unit', '500000');
  });

  test('returns 0 for zero quota', () => {
    expect(quotaToDisplayAmount(0)).toBe(0);
  });

  test('returns 0 for null', () => {
    expect(quotaToDisplayAmount(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(quotaToDisplayAmount(undefined)).toBe(0);
  });

  test('converts quota to USD', () => {
    getCurrencyConfig.mockReturnValue({ type: 'USD', rate: 1, symbol: '$' });
    expect(quotaToDisplayAmount(500000)).toBe(1);
  });

  test('converts quota to CNY with exchange rate', () => {
    getCurrencyConfig.mockReturnValue({ type: 'CNY', rate: 7, symbol: '¥' });
    expect(quotaToDisplayAmount(500000)).toBe(7);
  });

  test('returns raw quota for TOKENS type', () => {
    getCurrencyConfig.mockReturnValue({ type: 'TOKENS', rate: 1, symbol: '' });
    expect(quotaToDisplayAmount(500000)).toBe(500000);
  });

  test('handles negative quota', () => {
    getCurrencyConfig.mockReturnValue({ type: 'USD', rate: 1, symbol: '$' });
    expect(quotaToDisplayAmount(-500000)).toBe(-1);
  });

  test('uses custom rate', () => {
    getCurrencyConfig.mockReturnValue({ type: 'CUSTOM', rate: 3, symbol: '¤' });
    expect(quotaToDisplayAmount(500000)).toBe(3);
  });
});

describe('displayAmountToQuota', () => {
  beforeEach(() => {
    localStorage.setItem('quota_per_unit', '500000');
  });

  test('returns 0 for zero amount', () => {
    expect(displayAmountToQuota(0)).toBe(0);
  });

  test('returns 0 for null', () => {
    expect(displayAmountToQuota(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(displayAmountToQuota(undefined)).toBe(0);
  });

  test('converts USD to quota', () => {
    getCurrencyConfig.mockReturnValue({ type: 'USD', rate: 1, symbol: '$' });
    expect(displayAmountToQuota(1)).toBe(500000);
  });

  test('converts CNY to quota', () => {
    getCurrencyConfig.mockReturnValue({ type: 'CNY', rate: 7, symbol: '¥' });
    expect(displayAmountToQuota(7)).toBe(500000);
  });

  test('rounds result for TOKENS type', () => {
    getCurrencyConfig.mockReturnValue({ type: 'TOKENS', rate: 1, symbol: '' });
    expect(displayAmountToQuota(123.7)).toBe(124);
  });

  test('handles negative amount', () => {
    getCurrencyConfig.mockReturnValue({ type: 'USD', rate: 1, symbol: '$' });
    expect(displayAmountToQuota(-1)).toBe(-500000);
  });

  test('converts custom currency to quota', () => {
    getCurrencyConfig.mockReturnValue({ type: 'CUSTOM', rate: 3, symbol: '¤' });
    expect(displayAmountToQuota(3)).toBe(500000);
  });
});

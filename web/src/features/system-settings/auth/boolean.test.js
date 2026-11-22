import { toBoolean } from './boolean';

describe('toBoolean', () => {
  test('returns true for boolean true', () => {
    expect(toBoolean(true)).toBe(true);
  });

  test('returns false for boolean false', () => {
    expect(toBoolean(false)).toBe(false);
  });

  test('returns true for number 1', () => {
    expect(toBoolean(1)).toBe(true);
  });

  test('returns false for number 0', () => {
    expect(toBoolean(0)).toBe(false);
  });

  test('returns false for other numbers', () => {
    expect(toBoolean(2)).toBe(false);
    expect(toBoolean(-1)).toBe(false);
    expect(toBoolean(100)).toBe(false);
  });

  test('returns true for string "true"', () => {
    expect(toBoolean('true')).toBe(true);
  });

  test('returns true for string "TRUE"', () => {
    expect(toBoolean('TRUE')).toBe(true);
  });

  test('returns true for string "True"', () => {
    expect(toBoolean('True')).toBe(true);
  });

  test('returns true for string "1"', () => {
    expect(toBoolean('1')).toBe(true);
  });

  test('returns false for string "false"', () => {
    expect(toBoolean('false')).toBe(false);
  });

  test('returns false for string "0"', () => {
    expect(toBoolean('0')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(toBoolean('')).toBe(false);
  });

  test('returns false for arbitrary string', () => {
    expect(toBoolean('yes')).toBe(false);
    expect(toBoolean('no')).toBe(false);
    expect(toBoolean('abc')).toBe(false);
  });

  test('returns false for null', () => {
    expect(toBoolean(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(toBoolean(undefined)).toBe(false);
  });

  test('returns false for object', () => {
    expect(toBoolean({})).toBe(false);
  });

  test('returns false for array', () => {
    expect(toBoolean([])).toBe(false);
  });
});

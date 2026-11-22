import { getLogOther } from './log';

describe('getLogOther', () => {
  test('returns empty object for undefined', () => {
    expect(getLogOther(undefined)).toEqual({});
  });

  test('returns empty object for null', () => {
    expect(getLogOther(null)).toEqual({});
  });

  test('returns empty object for empty string', () => {
    expect(getLogOther('')).toEqual({});
  });

  test('returns the same object if input is already an object', () => {
    const obj = { foo: 'bar', count: 42 };
    expect(getLogOther(obj)).toBe(obj);
  });

  test('parses a valid JSON string', () => {
    const input = '{"model":"gpt-4","tokens":100}';
    expect(getLogOther(input)).toEqual({ model: 'gpt-4', tokens: 100 });
  });

  test('parses a JSON array string', () => {
    const input = '[1,2,3]';
    expect(getLogOther(input)).toEqual([1, 2, 3]);
  });

  test('returns null for invalid JSON string', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getLogOther('not valid json')).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('returns the object as-is for an array input', () => {
    const arr = [1, 2, 3];
    expect(getLogOther(arr)).toBe(arr);
  });

  test('parses nested JSON string', () => {
    const input = '{"a":{"b":"c"},"d":[1,2]}';
    expect(getLogOther(input)).toEqual({ a: { b: 'c' }, d: [1, 2] });
  });
});

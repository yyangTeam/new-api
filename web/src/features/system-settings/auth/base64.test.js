import { encodeToBase64 } from './base64';

describe('encodeToBase64', () => {
  test('encodes a simple ASCII string', () => {
    expect(encodeToBase64('Hello')).toBe(btoa('Hello'));
  });

  test('encodes an empty string', () => {
    expect(encodeToBase64('')).toBe('');
  });

  test('converts null to empty string then encodes', () => {
    expect(encodeToBase64(null)).toBe('');
  });

  test('converts undefined to empty string then encodes', () => {
    expect(encodeToBase64(undefined)).toBe('');
  });

  test('converts a number to string then encodes', () => {
    expect(encodeToBase64(12345)).toBe(btoa('12345'));
  });

  test('encodes UTF-8 characters (Chinese)', () => {
    const result = encodeToBase64('你好');
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(result), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toBe('你好');
  });

  test('encodes UTF-8 characters (emoji)', () => {
    const result = encodeToBase64('hello 🌍');
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(result), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toBe('hello 🌍');
  });

  test('encodes a string with special characters', () => {
    const input = 'key=value&foo=bar';
    expect(encodeToBase64(input)).toBe(btoa(input));
  });

  test('converts boolean to string then encodes', () => {
    expect(encodeToBase64(true)).toBe(btoa('true'));
    expect(encodeToBase64(false)).toBe(btoa('false'));
  });

  test('converts zero to string then encodes', () => {
    expect(encodeToBase64(0)).toBe(btoa('0'));
  });
});

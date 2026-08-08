vi.mock('./api', () => ({
  API: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import {
  getServerAddress,
  CHANNEL_CONN_CLIPBOARD_TYPE,
  encodeChannelConnectionString,
  parseChannelConnectionString,
} from './token';

describe('getServerAddress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns server_address from localStorage status', () => {
    localStorage.setItem('status', JSON.stringify({ server_address: 'https://api.example.com' }));
    expect(getServerAddress()).toBe('https://api.example.com');
  });

  test('falls back to window.location.origin when no status', () => {
    expect(getServerAddress()).toBe(window.location.origin);
  });

  test('falls back to window.location.origin when status has no server_address', () => {
    localStorage.setItem('status', JSON.stringify({}));
    expect(getServerAddress()).toBe(window.location.origin);
  });

  test('falls back to window.location.origin when status is invalid JSON', () => {
    localStorage.setItem('status', 'not-valid-json');
    expect(getServerAddress()).toBe(window.location.origin);
  });

  test('falls back to window.location.origin when server_address is empty string', () => {
    localStorage.setItem('status', JSON.stringify({ server_address: '' }));
    expect(getServerAddress()).toBe(window.location.origin);
  });
});

describe('CHANNEL_CONN_CLIPBOARD_TYPE', () => {
  test('is the expected constant', () => {
    expect(CHANNEL_CONN_CLIPBOARD_TYPE).toBe('newapi_channel_conn');
  });
});

describe('encodeChannelConnectionString', () => {
  test('produces valid JSON with _type, key, and url', () => {
    const result = encodeChannelConnectionString('sk-abc123', 'https://api.test.com');
    const parsed = JSON.parse(result);
    expect(parsed._type).toBe(CHANNEL_CONN_CLIPBOARD_TYPE);
    expect(parsed.key).toBe('sk-abc123');
    expect(parsed.url).toBe('https://api.test.com');
  });

  test('handles empty strings', () => {
    const result = encodeChannelConnectionString('', '');
    const parsed = JSON.parse(result);
    expect(parsed.key).toBe('');
    expect(parsed.url).toBe('');
  });
});

describe('parseChannelConnectionString', () => {
  test('returns null for null/undefined/empty input', () => {
    expect(parseChannelConnectionString(null)).toBeNull();
    expect(parseChannelConnectionString(undefined)).toBeNull();
    expect(parseChannelConnectionString('')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(parseChannelConnectionString(123)).toBeNull();
    expect(parseChannelConnectionString({})).toBeNull();
  });

  test('returns null for invalid JSON', () => {
    expect(parseChannelConnectionString('not json')).toBeNull();
  });

  test('returns null for JSON without correct _type', () => {
    expect(parseChannelConnectionString(JSON.stringify({ _type: 'other', key: 'k', url: 'u' }))).toBeNull();
  });

  test('returns null when key is missing', () => {
    expect(parseChannelConnectionString(JSON.stringify({
      _type: CHANNEL_CONN_CLIPBOARD_TYPE,
      url: 'https://example.com',
    }))).toBeNull();
  });

  test('returns null when url is missing', () => {
    expect(parseChannelConnectionString(JSON.stringify({
      _type: CHANNEL_CONN_CLIPBOARD_TYPE,
      key: 'sk-test',
    }))).toBeNull();
  });

  test('returns null when key is not a string', () => {
    expect(parseChannelConnectionString(JSON.stringify({
      _type: CHANNEL_CONN_CLIPBOARD_TYPE,
      key: 123,
      url: 'https://example.com',
    }))).toBeNull();
  });

  test('returns null when url is not a string', () => {
    expect(parseChannelConnectionString(JSON.stringify({
      _type: CHANNEL_CONN_CLIPBOARD_TYPE,
      key: 'sk-test',
      url: 456,
    }))).toBeNull();
  });

  test('parses valid connection string', () => {
    const encoded = encodeChannelConnectionString('sk-abc', 'https://api.com');
    const result = parseChannelConnectionString(encoded);
    expect(result).toEqual({ key: 'sk-abc', url: 'https://api.com' });
  });

  test('handles whitespace around the JSON', () => {
    const encoded = '  ' + encodeChannelConnectionString('sk-abc', 'https://api.com') + '  ';
    const result = parseChannelConnectionString(encoded);
    expect(result).toEqual({ key: 'sk-abc', url: 'https://api.com' });
  });

  test('roundtrips encode then parse', () => {
    const key = 'sk-long-key-with-special-chars-!@#$';
    const url = 'https://api.example.com/v1';
    const encoded = encodeChannelConnectionString(key, url);
    const result = parseChannelConnectionString(encoded);
    expect(result.key).toBe(key);
    expect(result.url).toBe(url);
  });
});

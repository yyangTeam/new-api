vi.mock('@douyinfe/semi-ui', () => ({
  Progress: 'Progress',
  Divider: 'Divider',
  Empty: 'Empty',
}));

vi.mock('@douyinfe/semi-illustrations', () => ({
  IllustrationConstruction: 'IllustrationConstruction',
  IllustrationConstructionDark: 'IllustrationConstructionDark',
}));

vi.mock('./utils', () => ({
  timestamp2string: vi.fn((ts) => `ts:${Math.round(ts)}`),
  timestamp2string1: vi.fn((ts, type, showYear) => `ts1:${Math.round(ts)}`),
  isDataCrossYear: vi.fn(() => false),
  copy: vi.fn(),
  showSuccess: vi.fn(),
}));

import {
  getDefaultTime,
  getTimeInterval,
  getInitialTimestamp,
  updateMapValue,
  initializeMaps,
} from './dashboard';

describe('getDefaultTime', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('returns "hour" when no value is stored', () => {
    expect(getDefaultTime()).toBe('hour');
  });

  test('returns stored value from localStorage', () => {
    localStorage.setItem('data_export_default_time', 'week');
    expect(getDefaultTime()).toBe('week');
  });

  test('returns stored value "day"', () => {
    localStorage.setItem('data_export_default_time', 'day');
    expect(getDefaultTime()).toBe('day');
  });
});

describe('getTimeInterval', () => {
  test('returns minutes for hour type by default', () => {
    expect(getTimeInterval('hour')).toBe(60);
  });

  test('returns seconds for hour type when isSeconds is true', () => {
    expect(getTimeInterval('hour', true)).toBe(3600);
  });

  test('returns minutes for day type', () => {
    expect(getTimeInterval('day')).toBe(1440);
  });

  test('returns seconds for day type', () => {
    expect(getTimeInterval('day', true)).toBe(86400);
  });

  test('returns minutes for week type', () => {
    expect(getTimeInterval('week')).toBe(10080);
  });

  test('returns seconds for week type', () => {
    expect(getTimeInterval('week', true)).toBe(604800);
  });

  test('falls back to hour intervals for unknown type', () => {
    expect(getTimeInterval('unknown')).toBe(60);
    expect(getTimeInterval('unknown', true)).toBe(3600);
  });
});

describe('getInitialTimestamp', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('returns a string value', () => {
    const result = getInitialTimestamp();
    expect(typeof result).toBe('string');
  });

  test('calls timestamp2string with approximately 24 hours ago when defaultTime is "hour"', () => {
    localStorage.setItem('data_export_default_time', 'hour');
    const result = getInitialTimestamp();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('calls timestamp2string with approximately 30 days ago when defaultTime is "week"', () => {
    localStorage.setItem('data_export_default_time', 'week');
    const result = getInitialTimestamp();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('calls timestamp2string with approximately 7 days ago for other defaultTime values', () => {
    localStorage.setItem('data_export_default_time', 'day');
    const result = getInitialTimestamp();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('updateMapValue', () => {
  test('initializes key to 0 and adds value when key does not exist', () => {
    const map = new Map();
    updateMapValue(map, 'key1', 10);
    expect(map.get('key1')).toBe(10);
  });

  test('accumulates values for existing key', () => {
    const map = new Map();
    updateMapValue(map, 'key1', 10);
    updateMapValue(map, 'key1', 5);
    expect(map.get('key1')).toBe(15);
  });

  test('handles multiple keys independently', () => {
    const map = new Map();
    updateMapValue(map, 'a', 3);
    updateMapValue(map, 'b', 7);
    updateMapValue(map, 'a', 2);
    expect(map.get('a')).toBe(5);
    expect(map.get('b')).toBe(7);
  });

  test('handles zero values', () => {
    const map = new Map();
    updateMapValue(map, 'key1', 0);
    expect(map.get('key1')).toBe(0);
  });

  test('handles negative values', () => {
    const map = new Map();
    updateMapValue(map, 'key1', 10);
    updateMapValue(map, 'key1', -3);
    expect(map.get('key1')).toBe(7);
  });

  test('handles float values', () => {
    const map = new Map();
    updateMapValue(map, 'key1', 1.5);
    updateMapValue(map, 'key1', 2.3);
    expect(map.get('key1')).toBeCloseTo(3.8);
  });
});

describe('initializeMaps', () => {
  test('initializes key in a single map', () => {
    const map = new Map();
    initializeMaps('key1', map);
    expect(map.get('key1')).toBe(0);
  });

  test('initializes key in multiple maps', () => {
    const map1 = new Map();
    const map2 = new Map();
    const map3 = new Map();
    initializeMaps('key1', map1, map2, map3);
    expect(map1.get('key1')).toBe(0);
    expect(map2.get('key1')).toBe(0);
    expect(map3.get('key1')).toBe(0);
  });

  test('does not overwrite existing values', () => {
    const map = new Map();
    map.set('key1', 42);
    initializeMaps('key1', map);
    expect(map.get('key1')).toBe(42);
  });

  test('only initializes maps where the key is missing', () => {
    const map1 = new Map();
    const map2 = new Map();
    map1.set('key1', 99);
    initializeMaps('key1', map1, map2);
    expect(map1.get('key1')).toBe(99);
    expect(map2.get('key1')).toBe(0);
  });

  test('handles no maps passed', () => {
    expect(() => initializeMaps('key1')).not.toThrow();
  });
});

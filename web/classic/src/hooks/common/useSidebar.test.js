vi.mock('../../helpers', () => ({ API: { get: vi.fn() } }));
vi.mock('../../context/Status', () => ({ StatusContext: { _currentValue: [] } }));
vi.mock('lottie-web', () => ({ default: {} }));

import { DEFAULT_ADMIN_CONFIG, mergeAdminConfig } from './useSidebar';

describe('DEFAULT_ADMIN_CONFIG', () => {
  test('has four top-level sections', () => {
    expect(Object.keys(DEFAULT_ADMIN_CONFIG).sort()).toEqual([
      'admin', 'chat', 'console', 'personal',
    ]);
  });

  test('every section has enabled set to true', () => {
    Object.values(DEFAULT_ADMIN_CONFIG).forEach((section) => {
      expect(section.enabled).toBe(true);
    });
  });

  test('chat section has expected modules', () => {
    expect(DEFAULT_ADMIN_CONFIG.chat).toEqual({
      enabled: true,
      playground: true,
      chat: true,
      image_gen: true,
    });
  });

  test('console section has expected modules', () => {
    expect(DEFAULT_ADMIN_CONFIG.console).toEqual({
      enabled: true,
      detail: true,
      token: true,
      log: true,
      midjourney: true,
      task: true,
    });
  });

  test('personal section has expected modules', () => {
    expect(DEFAULT_ADMIN_CONFIG.personal).toEqual({
      enabled: true,
      topup: true,
      personal: true,
    });
  });

  test('admin section has expected modules', () => {
    expect(DEFAULT_ADMIN_CONFIG.admin).toEqual({
      enabled: true,
      channel: true,
      models: true,
      deployment: true,
      redemption: true,
      user: true,
      subscription: true,
      setting: true,
    });
  });

  test('all module values are booleans', () => {
    Object.values(DEFAULT_ADMIN_CONFIG).forEach((section) => {
      Object.values(section).forEach((val) => {
        expect(typeof val).toBe('boolean');
      });
    });
  });
});

describe('mergeAdminConfig', () => {
  test('returns deep clone of defaults when called with null', () => {
    const result = mergeAdminConfig(null);
    expect(result).toEqual(DEFAULT_ADMIN_CONFIG);
    expect(result).not.toBe(DEFAULT_ADMIN_CONFIG);
  });

  test('returns deep clone of defaults when called with undefined', () => {
    const result = mergeAdminConfig(undefined);
    expect(result).toEqual(DEFAULT_ADMIN_CONFIG);
  });

  test('returns defaults when called with non-object', () => {
    expect(mergeAdminConfig('string')).toEqual(DEFAULT_ADMIN_CONFIG);
    expect(mergeAdminConfig(42)).toEqual(DEFAULT_ADMIN_CONFIG);
    expect(mergeAdminConfig(true)).toEqual(DEFAULT_ADMIN_CONFIG);
  });

  test('returns defaults when called with empty object', () => {
    expect(mergeAdminConfig({})).toEqual(DEFAULT_ADMIN_CONFIG);
  });

  test('overrides specific module values', () => {
    const result = mergeAdminConfig({
      chat: { playground: false },
    });
    expect(result.chat.playground).toBe(false);
    expect(result.chat.enabled).toBe(true);
    expect(result.chat.chat).toBe(true);
    expect(result.chat.image_gen).toBe(true);
  });

  test('overrides enabled at section level', () => {
    const result = mergeAdminConfig({
      console: { enabled: false },
    });
    expect(result.console.enabled).toBe(false);
    expect(result.console.detail).toBe(true);
  });

  test('merges multiple sections simultaneously', () => {
    const result = mergeAdminConfig({
      chat: { chat: false },
      admin: { channel: false, user: false },
    });
    expect(result.chat.chat).toBe(false);
    expect(result.chat.playground).toBe(true);
    expect(result.admin.channel).toBe(false);
    expect(result.admin.user).toBe(false);
    expect(result.admin.models).toBe(true);
  });

  test('adds new properties not in defaults', () => {
    const result = mergeAdminConfig({
      chat: { new_feature: true },
    });
    expect(result.chat.new_feature).toBe(true);
    expect(result.chat.enabled).toBe(true);
  });

  test('adds entirely new sections not in defaults', () => {
    const result = mergeAdminConfig({
      custom_section: { enabled: true, feature_a: true },
    });
    expect(result.custom_section).toEqual({ enabled: true, feature_a: true });
    expect(result.chat).toEqual(DEFAULT_ADMIN_CONFIG.chat);
  });

  test('skips non-object section values in saved config', () => {
    const result = mergeAdminConfig({
      chat: 'invalid',
      console: null,
      personal: 42,
    });
    expect(result.chat).toEqual(DEFAULT_ADMIN_CONFIG.chat);
    expect(result.console).toEqual(DEFAULT_ADMIN_CONFIG.console);
    expect(result.personal).toEqual(DEFAULT_ADMIN_CONFIG.personal);
  });

  test('does not mutate DEFAULT_ADMIN_CONFIG', () => {
    const before = JSON.stringify(DEFAULT_ADMIN_CONFIG);
    mergeAdminConfig({ chat: { enabled: false, playground: false } });
    expect(JSON.stringify(DEFAULT_ADMIN_CONFIG)).toBe(before);
  });

  test('returns independent objects on successive calls', () => {
    const result1 = mergeAdminConfig(null);
    const result2 = mergeAdminConfig(null);
    result1.chat.enabled = false;
    expect(result2.chat.enabled).toBe(true);
  });
});

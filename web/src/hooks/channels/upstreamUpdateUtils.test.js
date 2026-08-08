import {
  normalizeModelList,
  parseUpstreamUpdateMeta,
} from './upstreamUpdateUtils';

describe('normalizeModelList', () => {
  test('returns empty array for undefined input', () => {
    expect(normalizeModelList()).toEqual([]);
  });

  test('returns empty array for null input', () => {
    expect(normalizeModelList(null)).toEqual([]);
  });

  test('returns empty array for empty array', () => {
    expect(normalizeModelList([])).toEqual([]);
  });

  test('trims whitespace from model names', () => {
    expect(normalizeModelList(['  gpt-4  ', ' claude-3 '])).toEqual([
      'gpt-4',
      'claude-3',
    ]);
  });

  test('removes duplicate model names', () => {
    expect(normalizeModelList(['gpt-4', 'gpt-4', 'claude-3'])).toEqual([
      'gpt-4',
      'claude-3',
    ]);
  });

  test('removes duplicates after trimming', () => {
    expect(normalizeModelList(['gpt-4', '  gpt-4  '])).toEqual(['gpt-4']);
  });

  test('filters out empty strings', () => {
    expect(normalizeModelList(['gpt-4', '', '  ', 'claude-3'])).toEqual([
      'gpt-4',
      'claude-3',
    ]);
  });

  test('converts non-string values via String()', () => {
    expect(normalizeModelList([123, 'gpt-4'])).toEqual(['123', 'gpt-4']);
  });

  test('filters out null and undefined entries', () => {
    expect(normalizeModelList([null, undefined, 'gpt-4'])).toEqual(['gpt-4']);
  });
});

describe('parseUpstreamUpdateMeta', () => {
  test('returns disabled defaults for null', () => {
    expect(parseUpstreamUpdateMeta(null)).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('returns disabled defaults for undefined', () => {
    expect(parseUpstreamUpdateMeta(undefined)).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('returns disabled defaults for empty string', () => {
    expect(parseUpstreamUpdateMeta('')).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('returns disabled defaults for invalid JSON string', () => {
    expect(parseUpstreamUpdateMeta('not json')).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('returns disabled defaults for a number', () => {
    expect(parseUpstreamUpdateMeta(42)).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('parses object with enabled=true', () => {
    const input = {
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: ['gpt-4', 'claude-3'],
      upstream_model_update_last_removed_models: ['gpt-3'],
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: true,
      pendingAddModels: ['gpt-4', 'claude-3'],
      pendingRemoveModels: ['gpt-3'],
    });
  });

  test('parses object with enabled=false', () => {
    const input = {
      upstream_model_update_check_enabled: false,
      upstream_model_update_last_detected_models: ['gpt-4'],
      upstream_model_update_last_removed_models: [],
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: false,
      pendingAddModels: ['gpt-4'],
      pendingRemoveModels: [],
    });
  });

  test('treats missing enabled field as false', () => {
    const input = {
      upstream_model_update_last_detected_models: ['gpt-4'],
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: false,
      pendingAddModels: ['gpt-4'],
      pendingRemoveModels: [],
    });
  });

  test('treats truthy non-boolean enabled value as false', () => {
    const input = {
      upstream_model_update_check_enabled: 'yes',
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('parses valid JSON string input', () => {
    const input = JSON.stringify({
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: ['gpt-4o'],
      upstream_model_update_last_removed_models: ['old-model'],
    });
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: true,
      pendingAddModels: ['gpt-4o'],
      pendingRemoveModels: ['old-model'],
    });
  });

  test('normalizes model lists (trims, dedupes, filters empties)', () => {
    const input = {
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: [
        '  gpt-4  ',
        'gpt-4',
        '',
        'claude-3',
      ],
      upstream_model_update_last_removed_models: [null, 'old-model', '  '],
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: true,
      pendingAddModels: ['gpt-4', 'claude-3'],
      pendingRemoveModels: ['old-model'],
    });
  });

  test('handles missing model arrays gracefully', () => {
    const input = {
      upstream_model_update_check_enabled: true,
    };
    expect(parseUpstreamUpdateMeta(input)).toEqual({
      enabled: true,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });

  test('returns disabled defaults for JSON string that parses to non-object', () => {
    expect(parseUpstreamUpdateMeta('"just a string"')).toEqual({
      enabled: false,
      pendingAddModels: [],
      pendingRemoveModels: [],
    });
  });
});

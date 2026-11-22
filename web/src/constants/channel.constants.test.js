import {
  CHANNEL_OPTIONS,
  MODEL_FETCHABLE_CHANNEL_TYPES,
} from './channel.constants';

describe('CHANNEL_OPTIONS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(CHANNEL_OPTIONS)).toBe(true);
    expect(CHANNEL_OPTIONS.length).toBeGreaterThan(0);
  });

  test('every entry has value, color, and label properties', () => {
    CHANNEL_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('color');
      expect(option).toHaveProperty('label');
      expect(typeof option.value).toBe('number');
      expect(typeof option.color).toBe('string');
      expect(typeof option.label).toBe('string');
    });
  });

  test('all values are unique', () => {
    const values = CHANNEL_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  test('all labels are non-empty strings', () => {
    CHANNEL_OPTIONS.forEach((option) => {
      expect(option.label.length).toBeGreaterThan(0);
    });
  });

  test('contains OpenAI as the first option', () => {
    expect(CHANNEL_OPTIONS[0]).toEqual({
      value: 1,
      color: 'green',
      label: 'OpenAI',
    });
  });

  test('contains known channel types', () => {
    const labels = CHANNEL_OPTIONS.map((o) => o.label);
    expect(labels).toContain('OpenAI');
    expect(labels).toContain('Anthropic Claude');
    expect(labels).toContain('Azure OpenAI');
    expect(labels).toContain('Google Gemini');
    expect(labels).toContain('DeepSeek');
  });

  test('contains specific value-label pairs', () => {
    const byValue = Object.fromEntries(
      CHANNEL_OPTIONS.map((o) => [o.value, o.label]),
    );
    expect(byValue[1]).toBe('OpenAI');
    expect(byValue[14]).toBe('Anthropic Claude');
    expect(byValue[3]).toBe('Azure OpenAI');
    expect(byValue[24]).toBe('Google Gemini');
    expect(byValue[33]).toBe('AWS Claude');
    expect(byValue[43]).toBe('DeepSeek');
    expect(byValue[4]).toBe('Ollama');
  });
});

describe('MODEL_FETCHABLE_CHANNEL_TYPES', () => {
  test('is a Set', () => {
    expect(MODEL_FETCHABLE_CHANNEL_TYPES).toBeInstanceOf(Set);
  });

  test('is non-empty', () => {
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.size).toBeGreaterThan(0);
  });

  test('contains expected channel type IDs', () => {
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(1)).toBe(true);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(4)).toBe(true);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(14)).toBe(true);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(24)).toBe(true);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(43)).toBe(true);
  });

  test('does not contain channel types that should not be fetchable', () => {
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(2)).toBe(false);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(3)).toBe(false);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(8)).toBe(false);
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(5)).toBe(false);
  });

  test('has the correct size', () => {
    expect(MODEL_FETCHABLE_CHANNEL_TYPES.size).toBe(17);
  });

  test('all values are numbers from CHANNEL_OPTIONS', () => {
    const channelValues = new Set(CHANNEL_OPTIONS.map((o) => o.value));
    MODEL_FETCHABLE_CHANNEL_TYPES.forEach((type) => {
      expect(typeof type).toBe('number');
      expect(channelValues.has(type)).toBe(true);
    });
  });

  test('contains all expected IDs', () => {
    const expected = [1, 4, 14, 34, 17, 26, 27, 24, 47, 25, 20, 23, 31, 40, 42, 48, 43];
    expected.forEach((id) => {
      expect(MODEL_FETCHABLE_CHANNEL_TYPES.has(id)).toBe(true);
    });
  });
});

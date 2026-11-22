import { DATE_RANGE_PRESETS } from './console.constants';

describe('DATE_RANGE_PRESETS', () => {
  test('is an array with 5 presets', () => {
    expect(Array.isArray(DATE_RANGE_PRESETS)).toBe(true);
    expect(DATE_RANGE_PRESETS).toHaveLength(5);
  });

  test('each preset has text, start, and end properties', () => {
    DATE_RANGE_PRESETS.forEach((preset) => {
      expect(preset).toHaveProperty('text');
      expect(preset).toHaveProperty('start');
      expect(preset).toHaveProperty('end');
      expect(typeof preset.text).toBe('string');
      expect(typeof preset.start).toBe('function');
      expect(typeof preset.end).toBe('function');
    });
  });

  test('has the expected text labels in order', () => {
    const labels = DATE_RANGE_PRESETS.map((p) => p.text);
    expect(labels).toEqual([
      '今天',
      '近 7 天',
      '本周',
      '近 30 天',
      '本月',
    ]);
  });

  test('start() returns a Date object for each preset', () => {
    DATE_RANGE_PRESETS.forEach((preset) => {
      const result = preset.start();
      expect(result).toBeInstanceOf(Date);
    });
  });

  test('end() returns a Date object for each preset', () => {
    DATE_RANGE_PRESETS.forEach((preset) => {
      const result = preset.end();
      expect(result).toBeInstanceOf(Date);
    });
  });

  test('start is before or equal to end for each preset', () => {
    DATE_RANGE_PRESETS.forEach((preset) => {
      const start = preset.start();
      const end = preset.end();
      expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
    });
  });

  test('"今天" preset covers the current day', () => {
    const today = DATE_RANGE_PRESETS[0];
    const start = today.start();
    const end = today.end();
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getDate()).toBe(now.getDate());
    expect(end.getFullYear()).toBe(now.getFullYear());
    expect(end.getMonth()).toBe(now.getMonth());
    expect(end.getDate()).toBe(now.getDate());
  });

  test('"近 7 天" preset spans approximately 7 days', () => {
    const preset = DATE_RANGE_PRESETS[1];
    const start = preset.start();
    const end = preset.end();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(7);
  });

  test('"近 30 天" preset spans approximately 30 days', () => {
    const preset = DATE_RANGE_PRESETS[3];
    const start = preset.start();
    const end = preset.end();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  test('"本月" preset starts on the 1st of the current month', () => {
    const preset = DATE_RANGE_PRESETS[4];
    const start = preset.start();
    expect(start.getDate()).toBe(1);
  });
});

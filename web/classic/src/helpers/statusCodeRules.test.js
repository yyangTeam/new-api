import { parseHttpStatusCodeRules } from './statusCodeRules';

describe('parseHttpStatusCodeRules', () => {
  test('returns empty result for null/undefined/empty input', () => {
    const cases = [null, undefined, '', '  '];
    for (const input of cases) {
      const result = parseHttpStatusCodeRules(input);
      expect(result.ok).toBe(true);
      expect(result.ranges).toEqual([]);
      expect(result.tokens).toEqual([]);
      expect(result.normalized).toBe('');
      expect(result.invalidTokens).toEqual([]);
    }
  });

  test('parses a single status code', () => {
    const result = parseHttpStatusCodeRules('200');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 200, end: 200 }]);
    expect(result.tokens).toEqual(['200']);
    expect(result.normalized).toBe('200');
  });

  test('parses a range', () => {
    const result = parseHttpStatusCodeRules('400-499');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 400, end: 499 }]);
    expect(result.tokens).toEqual(['400-499']);
    expect(result.normalized).toBe('400-499');
  });

  test('parses multiple codes and ranges', () => {
    const result = parseHttpStatusCodeRules('200, 301, 400-499, 500');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 301, end: 301 },
      { start: 400, end: 500 },
    ]);
  });

  test('handles Chinese comma separator', () => {
    const result = parseHttpStatusCodeRules('200，301，500');
    expect(result.ok).toBe(true);
    expect(result.ranges).toHaveLength(3);
    expect(result.ranges[0]).toEqual({ start: 200, end: 200 });
    expect(result.ranges[1]).toEqual({ start: 301, end: 301 });
    expect(result.ranges[2]).toEqual({ start: 500, end: 500 });
  });

  test('merges overlapping ranges', () => {
    const result = parseHttpStatusCodeRules('200-300, 250-350');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 200, end: 350 }]);
    expect(result.normalized).toBe('200-350');
  });

  test('merges adjacent ranges', () => {
    const result = parseHttpStatusCodeRules('200-300, 301-400');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 200, end: 400 }]);
    expect(result.normalized).toBe('200-400');
  });

  test('merges single code into range', () => {
    const result = parseHttpStatusCodeRules('200, 201');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 200, end: 201 }]);
    expect(result.normalized).toBe('200-201');
  });

  test('sorts ranges before merging', () => {
    const result = parseHttpStatusCodeRules('500, 200, 300');
    expect(result.ok).toBe(true);
    expect(result.ranges[0].start).toBe(200);
    expect(result.ranges[1].start).toBe(300);
    expect(result.ranges[2].start).toBe(500);
  });

  test('rejects codes below 100', () => {
    const result = parseHttpStatusCodeRules('99');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toContain('99');
  });

  test('rejects codes above 599', () => {
    const result = parseHttpStatusCodeRules('600');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toContain('600');
  });

  test('rejects reversed ranges', () => {
    const result = parseHttpStatusCodeRules('500-400');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toContain('500-400');
  });

  test('rejects non-numeric tokens', () => {
    const result = parseHttpStatusCodeRules('abc');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toContain('abc');
  });

  test('rejects triple-range formats', () => {
    const result = parseHttpStatusCodeRules('100-200-300');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toContain('100-200-300');
  });

  test('boundary values: 100 and 599', () => {
    const result = parseHttpStatusCodeRules('100, 599');
    expect(result.ok).toBe(true);
    expect(result.ranges).toHaveLength(2);
    expect(result.ranges[0]).toEqual({ start: 100, end: 100 });
    expect(result.ranges[1]).toEqual({ start: 599, end: 599 });
  });

  test('full range 100-599', () => {
    const result = parseHttpStatusCodeRules('100-599');
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 100, end: 599 }]);
    expect(result.normalized).toBe('100-599');
  });

  test('handles numeric input', () => {
    const result = parseHttpStatusCodeRules(200);
    expect(result.ok).toBe(true);
    expect(result.ranges).toEqual([{ start: 200, end: 200 }]);
  });

  test('ignores empty segments from trailing commas', () => {
    const result = parseHttpStatusCodeRules('200, 300, ');
    expect(result.ok).toBe(true);
    expect(result.ranges).toHaveLength(2);
  });

  test('invalidTokens returns all invalid on failure', () => {
    const result = parseHttpStatusCodeRules('abc, xyz, 200');
    expect(result.ok).toBe(false);
    expect(result.invalidTokens).toEqual(['abc', 'xyz']);
    expect(result.ranges).toEqual([]);
  });

  test('single code produces matching start and end', () => {
    const result = parseHttpStatusCodeRules('404');
    expect(result.ranges[0].start).toBe(result.ranges[0].end);
  });

  test('range with out-of-bounds end', () => {
    const result = parseHttpStatusCodeRules('400-700');
    expect(result.ok).toBe(false);
  });

  test('range with out-of-bounds start', () => {
    const result = parseHttpStatusCodeRules('50-200');
    expect(result.ok).toBe(false);
  });
});

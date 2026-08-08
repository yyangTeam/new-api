import {
  BILLING_VARS,
  BILLING_VAR_KEYS,
  BILLING_PRICING_VARS,
  BILLING_EXTRA_VARS,
  BILLING_VAR_KEY_TO_FIELD,
  BILLING_VAR_FIELD_TO_LABEL,
  BILLING_VAR_FIELD_TO_SHORT_LABEL,
  BILLING_CACHE_VAR_MAP,
  BILLING_VAR_REGEX,
  BILLING_CONDITION_VARS,
} from './billing.constants';

describe('BILLING_VARS', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(BILLING_VARS)).toBe(true);
    expect(BILLING_VARS.length).toBeGreaterThan(0);
  });

  test('every entry has required fields', () => {
    for (const v of BILLING_VARS) {
      expect(v).toHaveProperty('key');
      expect(v).toHaveProperty('label');
      expect(v).toHaveProperty('shortLabel');
      expect(v).toHaveProperty('side');
      expect(typeof v.key).toBe('string');
      expect(typeof v.label).toBe('string');
    }
  });

  test('has unique keys', () => {
    const keys = BILLING_VARS.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('contains base input/output variables p and c', () => {
    const pVar = BILLING_VARS.find((v) => v.key === 'p');
    const cVar = BILLING_VARS.find((v) => v.key === 'c');
    expect(pVar).toBeDefined();
    expect(pVar.isBase).toBe(true);
    expect(pVar.side).toBe('input');
    expect(cVar).toBeDefined();
    expect(cVar.isBase).toBe(true);
    expect(cVar.side).toBe('output');
  });
});

describe('BILLING_VAR_KEYS', () => {
  test('contains all keys from BILLING_VARS', () => {
    expect(BILLING_VAR_KEYS).toEqual(BILLING_VARS.map((v) => v.key));
  });
});

describe('BILLING_PRICING_VARS', () => {
  test('excludes condition-only variables', () => {
    for (const v of BILLING_PRICING_VARS) {
      expect(v.isConditionOnly).toBeFalsy();
    }
  });

  test('includes base variables', () => {
    const keys = BILLING_PRICING_VARS.map((v) => v.key);
    expect(keys).toContain('p');
    expect(keys).toContain('c');
  });

  test('excludes len (condition-only)', () => {
    const keys = BILLING_PRICING_VARS.map((v) => v.key);
    expect(keys).not.toContain('len');
  });
});

describe('BILLING_EXTRA_VARS', () => {
  test('excludes base and condition-only variables', () => {
    for (const v of BILLING_EXTRA_VARS) {
      expect(v.isBase).toBeFalsy();
      expect(v.isConditionOnly).toBeFalsy();
    }
  });

  test('does not contain p, c, or len', () => {
    const keys = BILLING_EXTRA_VARS.map((v) => v.key);
    expect(keys).not.toContain('p');
    expect(keys).not.toContain('c');
    expect(keys).not.toContain('len');
  });
});

describe('BILLING_VAR_KEY_TO_FIELD', () => {
  test('maps each pricing var key to its field', () => {
    for (const v of BILLING_PRICING_VARS) {
      expect(BILLING_VAR_KEY_TO_FIELD[v.key]).toBe(v.field);
    }
  });

  test('does not contain condition-only keys', () => {
    expect(BILLING_VAR_KEY_TO_FIELD).not.toHaveProperty('len');
  });
});

describe('BILLING_VAR_FIELD_TO_LABEL', () => {
  test('maps each pricing var field to its label', () => {
    for (const v of BILLING_PRICING_VARS) {
      expect(BILLING_VAR_FIELD_TO_LABEL[v.field]).toBe(v.label);
    }
  });
});

describe('BILLING_VAR_FIELD_TO_SHORT_LABEL', () => {
  test('maps each pricing var field to its short label', () => {
    for (const v of BILLING_PRICING_VARS) {
      expect(BILLING_VAR_FIELD_TO_SHORT_LABEL[v.field]).toBe(v.shortLabel);
    }
  });
});

describe('BILLING_CACHE_VAR_MAP', () => {
  test('contains entries from extra vars with tierField and key', () => {
    expect(BILLING_CACHE_VAR_MAP.length).toBe(BILLING_EXTRA_VARS.length);
    for (let i = 0; i < BILLING_EXTRA_VARS.length; i++) {
      expect(BILLING_CACHE_VAR_MAP[i]).toEqual({
        field: BILLING_EXTRA_VARS[i].tierField,
        exprVar: BILLING_EXTRA_VARS[i].key,
      });
    }
  });
});

describe('BILLING_VAR_REGEX', () => {
  test('matches variable multiplication expressions', () => {
    const matches = [];
    let match;
    const str = 'p * 1.5 + c * 2.0 + cr * 0.5';
    while ((match = BILLING_VAR_REGEX.exec(str)) !== null) {
      matches.push({ key: match[1], multiplier: match[2] });
    }
    expect(matches).toEqual([
      { key: 'p', multiplier: '1.5' },
      { key: 'c', multiplier: '2.0' },
      { key: 'cr', multiplier: '0.5' },
    ]);
  });

  test('does not match unknown variable names', () => {
    BILLING_VAR_REGEX.lastIndex = 0;
    const str = 'xyz * 1.5';
    expect(BILLING_VAR_REGEX.test(str)).toBe(false);
  });
});

describe('BILLING_CONDITION_VARS', () => {
  test('contains base vars and condition-only vars', () => {
    expect(BILLING_CONDITION_VARS).toContain('p');
    expect(BILLING_CONDITION_VARS).toContain('c');
    expect(BILLING_CONDITION_VARS).toContain('len');
  });

  test('does not contain extra non-base, non-condition vars', () => {
    for (const v of BILLING_EXTRA_VARS) {
      expect(BILLING_CONDITION_VARS).not.toContain(v.key);
    }
  });
});

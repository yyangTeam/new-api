import {
  parseTiersFromExpr,
  normalizeTierLabel,
  splitBillingExprAndRequestRules,
  combineBillingExpr,
  createEmptyCondition,
  createEmptyRuleGroup,
} from './billing-expr'

describe('parseTiersFromExpr', () => {
  test('returns empty array for empty string', () => {
    expect(parseTiersFromExpr('')).toEqual([])
  })

  test('returns empty array for null-ish input', () => {
    expect(parseTiersFromExpr(undefined as unknown as string)).toEqual([])
  })

  test('parses a single unconditional tier', () => {
    const expr = 'tier("Base", p*1 + c*2)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].label).toBe('Base')
    expect(tiers[0].inputPrice).toBe(1)
    expect(tiers[0].outputPrice).toBe(2)
    expect(tiers[0].conditions).toEqual([])
  })

  test('parses versioned expression', () => {
    const expr = 'v2:tier("Standard", p*1.5 + c*3)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].label).toBe('Standard')
    expect(tiers[0].inputPrice).toBe(1.5)
    expect(tiers[0].outputPrice).toBe(3)
  })

  test('parses conditional tiers', () => {
    const expr = 'p<=128000 ? tier("Short", p*1 + c*2) : tier("Long", p*2 + c*4)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(2)
    expect(tiers[0].label).toBe('Short')
    expect(tiers[0].conditions).toEqual([
      { var: 'p', op: '<=', value: 128000 },
    ])
    expect(tiers[1].label).toBe('Long')
    expect(tiers[1].conditions).toEqual([])
  })

  test('parses tier with multiple conditions using &&', () => {
    const expr = 'p>1000 && c<=5000 ? tier("Mid", p*1.5 + c*3)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].conditions).toEqual([
      { var: 'p', op: '>', value: 1000 },
      { var: 'c', op: '<=', value: 5000 },
    ])
  })

  test('parses tier with len condition', () => {
    const expr = 'len>=200000 ? tier("Long context", p*2 + c*4)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].conditions).toEqual([
      { var: 'len', op: '>=', value: 200000 },
    ])
  })

  test('parses tier with cache vars', () => {
    const expr = 'tier("Cache", p*1 + c*2 + cr*0.5 + cc*0.8)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].cacheReadPrice).toBe(0.5)
    expect(tiers[0].cacheCreatePrice).toBe(0.8)
  })

  test('sets missing vars to 0', () => {
    const expr = 'tier("Simple", p*1)'
    const tiers = parseTiersFromExpr(expr)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].inputPrice).toBe(1)
    expect(tiers[0].outputPrice).toBe(0)
  })

  test('returns empty array for invalid expression', () => {
    expect(parseTiersFromExpr('not a valid expr')).toEqual([])
  })
})

describe('normalizeTierLabel', () => {
  test('returns empty string for undefined', () => {
    expect(normalizeTierLabel(undefined)).toBe('')
  })

  test('returns empty string for empty string', () => {
    expect(normalizeTierLabel('')).toBe('')
  })

  test('normalizes less-than-or-equal variants', () => {
    expect(normalizeTierLabel('<=128k')).toBe('<128k')
    expect(normalizeTierLabel('≤128k')).toBe('<128k')
  })

  test('normalizes greater-than-or-equal variants', () => {
    expect(normalizeTierLabel('>=200k')).toBe('>200k')
    expect(normalizeTierLabel('≥200k')).toBe('>200k')
  })

  test('removes whitespace', () => {
    expect(normalizeTierLabel('p < 128k')).toBe('p<128k')
  })

  test('lowercases the label', () => {
    expect(normalizeTierLabel('SHORT')).toBe('short')
  })

  test('handles full-width comparison operators', () => {
    expect(normalizeTierLabel('＜＝128k')).toBe('<128k')
    expect(normalizeTierLabel('＞＝200k')).toBe('>200k')
  })
})

describe('splitBillingExprAndRequestRules', () => {
  test('returns empty strings for empty input', () => {
    expect(splitBillingExprAndRequestRules('')).toEqual({
      billingExpr: '',
      requestRuleExpr: '',
    })
  })

  test('returns the expression as billingExpr when no rule factors', () => {
    const expr = 'tier("Base", p*1 + c*2)'
    const result = splitBillingExprAndRequestRules(expr)
    expect(result.billingExpr).toBe(expr)
    expect(result.requestRuleExpr).toBe('')
  })

  test('splits billing expr and request rule', () => {
    const base = 'tier("Base", p*1 + c*2)'
    const rule = '(param("model") == "gpt-4" ? 1.5 : 1)'
    const combined = `(${base}) * ${rule}`
    const result = splitBillingExprAndRequestRules(combined)
    expect(result.billingExpr).toBe(base)
    expect(result.requestRuleExpr).toBe(rule)
  })

  test('returns whole expr as billingExpr when more than one base part', () => {
    const expr = 'something * another * (param("x") == "y" ? 2 : 1)'
    const result = splitBillingExprAndRequestRules(expr)
    expect(result.billingExpr).toBe(expr)
    expect(result.requestRuleExpr).toBe('')
  })
})

describe('combineBillingExpr', () => {
  test('returns empty string when base is empty', () => {
    expect(combineBillingExpr('', 'some rule')).toBe('')
  })

  test('returns base when rules is empty', () => {
    expect(combineBillingExpr('tier("A", p*1)', '')).toBe('tier("A", p*1)')
  })

  test('combines base and rules with parentheses', () => {
    const result = combineBillingExpr(
      'tier("A", p*1)',
      '(param("x") == "y" ? 2 : 1)'
    )
    expect(result).toBe('(tier("A", p*1)) * (param("x") == "y" ? 2 : 1)')
  })

  test('trims whitespace', () => {
    const result = combineBillingExpr('  base  ', '  rules  ')
    expect(result).toBe('(base) * rules')
  })
})

describe('createEmptyCondition', () => {
  test('returns a param condition with default values', () => {
    const cond = createEmptyCondition()
    expect(cond).toEqual({
      source: 'param',
      path: '',
      mode: 'eq',
      value: '',
    })
  })
})

describe('createEmptyRuleGroup', () => {
  test('returns a group with one empty condition and empty multiplier', () => {
    const group = createEmptyRuleGroup()
    expect(group.conditions).toHaveLength(1)
    expect(group.conditions[0]).toEqual({
      source: 'param',
      path: '',
      mode: 'eq',
      value: '',
    })
    expect(group.multiplier).toBe('')
  })
})

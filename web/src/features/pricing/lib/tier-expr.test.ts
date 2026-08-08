import {
  getTierCacheMode,
  normalizeVisualTier,
  createDefaultVisualConfig,
  normalizeVisualConfig,
  generateExprFromVisualConfig,
  tryParseVisualConfig,
  evalExprLocally,
  exprUsesExtraVars,
  CACHE_MODE_TIMED,
  CACHE_MODE_GENERIC,
  type VisualTier,
  type VisualConfig,
  type ExtraTokenValues,
} from './tier-expr'

const ZERO_EXTRAS: ExtraTokenValues = {
  cacheReadTokens: 0,
  cacheCreateTokens: 0,
  cacheCreate1hTokens: 0,
  imageTokens: 0,
  imageOutputTokens: 0,
  audioInputTokens: 0,
  audioOutputTokens: 0,
}

function makeTier(overrides: Partial<VisualTier> = {}): VisualTier {
  return normalizeVisualTier(overrides)
}

describe('getTierCacheMode', () => {
  test('returns timed when cache_mode is timed', () => {
    expect(getTierCacheMode({ cache_mode: CACHE_MODE_TIMED })).toBe(CACHE_MODE_TIMED)
  })

  test('returns generic when cache_mode is generic', () => {
    expect(getTierCacheMode({ cache_mode: CACHE_MODE_GENERIC })).toBe(CACHE_MODE_GENERIC)
  })

  test('returns timed when cache_create_1h_unit_cost > 0 and no explicit mode', () => {
    expect(getTierCacheMode({ cache_create_1h_unit_cost: 5 })).toBe(CACHE_MODE_TIMED)
  })

  test('returns generic when cache_create_1h_unit_cost is 0', () => {
    expect(getTierCacheMode({ cache_create_1h_unit_cost: 0 })).toBe(CACHE_MODE_GENERIC)
  })

  test('returns generic for null tier', () => {
    expect(getTierCacheMode(null)).toBe(CACHE_MODE_GENERIC)
  })

  test('returns generic for undefined tier', () => {
    expect(getTierCacheMode(undefined)).toBe(CACHE_MODE_GENERIC)
  })

  test('returns generic for empty object', () => {
    expect(getTierCacheMode({})).toBe(CACHE_MODE_GENERIC)
  })
})

describe('normalizeVisualTier', () => {
  test('fills defaults for empty input', () => {
    const tier = normalizeVisualTier({})
    expect(tier.label).toBe('')
    expect(tier.input_unit_cost).toBe(0)
    expect(tier.output_unit_cost).toBe(0)
    expect(tier.cache_mode).toBe(CACHE_MODE_GENERIC)
    expect(tier.conditions).toEqual([])
    expect(tier.cache_read_unit_cost).toBe(0)
    expect(tier.cache_create_unit_cost).toBe(0)
    expect(tier.cache_create_1h_unit_cost).toBe(0)
    expect(tier.image_unit_cost).toBe(0)
    expect(tier.image_output_unit_cost).toBe(0)
    expect(tier.audio_input_unit_cost).toBe(0)
    expect(tier.audio_output_unit_cost).toBe(0)
  })

  test('preserves provided values', () => {
    const tier = normalizeVisualTier({
      label: 'premium',
      input_unit_cost: 10,
      output_unit_cost: 20,
      cache_read_unit_cost: 5,
    })
    expect(tier.label).toBe('premium')
    expect(tier.input_unit_cost).toBe(10)
    expect(tier.output_unit_cost).toBe(20)
    expect(tier.cache_read_unit_cost).toBe(5)
  })

  test('converts non-numeric cache values to 0', () => {
    const tier = normalizeVisualTier({
      cache_read_unit_cost: 'abc' as unknown as number,
    })
    expect(tier.cache_read_unit_cost).toBe(0)
  })

  test('preserves original input values through spread', () => {
    const tier = normalizeVisualTier({
      input_unit_cost: 42,
      conditions: [{ var: 'p', op: '>=' as const, value: 100 }],
    })
    expect(tier.input_unit_cost).toBe(42)
    expect(tier.conditions).toHaveLength(1)
  })

  test('uses no arguments default', () => {
    const tier = normalizeVisualTier()
    expect(tier.label).toBe('')
    expect(tier.input_unit_cost).toBe(0)
  })
})

describe('createDefaultVisualConfig', () => {
  test('returns config with one base tier', () => {
    const config = createDefaultVisualConfig()
    expect(config.tiers).toHaveLength(1)
    expect(config.tiers[0].label).toBe('base')
    expect(config.tiers[0].input_unit_cost).toBe(0)
    expect(config.tiers[0].output_unit_cost).toBe(0)
    expect(config.tiers[0].cache_mode).toBe(CACHE_MODE_GENERIC)
    expect(config.tiers[0].conditions).toEqual([])
  })
})

describe('normalizeVisualConfig', () => {
  test('returns default config for null', () => {
    const config = normalizeVisualConfig(null)
    expect(config.tiers).toHaveLength(1)
    expect(config.tiers[0].label).toBe('base')
  })

  test('returns default config for undefined', () => {
    const config = normalizeVisualConfig(undefined)
    expect(config.tiers).toHaveLength(1)
  })

  test('returns default config for empty tiers array', () => {
    const config = normalizeVisualConfig({ tiers: [] })
    expect(config.tiers).toHaveLength(1)
  })

  test('normalizes each tier in the config', () => {
    const config = normalizeVisualConfig({
      tiers: [
        { label: 'a', input_unit_cost: 5 } as Partial<VisualTier> as VisualTier,
      ],
    })
    expect(config.tiers).toHaveLength(1)
    expect(config.tiers[0].label).toBe('a')
    expect(config.tiers[0].output_unit_cost).toBe(0)
  })
})

describe('generateExprFromVisualConfig', () => {
  test('returns default expression for null config', () => {
    expect(generateExprFromVisualConfig(null)).toBe('p * 0 + c * 0')
  })

  test('returns default expression for empty tiers', () => {
    expect(generateExprFromVisualConfig({ tiers: [] })).toBe('p * 0 + c * 0')
  })

  test('generates single tier expression without conditions', () => {
    const config: VisualConfig = {
      tiers: [makeTier({ label: 'base', input_unit_cost: 10, output_unit_cost: 20 })],
    }
    const expr = generateExprFromVisualConfig(config)
    expect(expr).toBe('tier("base", p * 10 + c * 20)')
  })

  test('generates single tier expression with conditions', () => {
    const config: VisualConfig = {
      tiers: [
        makeTier({
          label: 'big',
          input_unit_cost: 30,
          output_unit_cost: 60,
          conditions: [{ var: 'p', op: '>=', value: 128000 }],
        }),
      ],
    }
    const expr = generateExprFromVisualConfig(config)
    expect(expr).toBe(
      'p >= 128000 ? tier("big", p * 30 + c * 60) : p * 0 + c * 0'
    )
  })

  test('generates multi-tier expression', () => {
    const config: VisualConfig = {
      tiers: [
        makeTier({
          label: 'large',
          input_unit_cost: 30,
          output_unit_cost: 60,
          conditions: [{ var: 'p', op: '>=', value: 128000 }],
        }),
        makeTier({
          label: 'small',
          input_unit_cost: 15,
          output_unit_cost: 30,
        }),
      ],
    }
    const expr = generateExprFromVisualConfig(config)
    expect(expr).toContain('tier("large"')
    expect(expr).toContain('tier("small"')
  })

  test('uses default label for tier without label', () => {
    const config: VisualConfig = {
      tiers: [makeTier({ label: '', input_unit_cost: 5, output_unit_cost: 10 })],
    }
    const expr = generateExprFromVisualConfig(config)
    expect(expr).toContain('tier("default"')
  })

  test('includes cache vars when non-zero', () => {
    const config: VisualConfig = {
      tiers: [
        makeTier({
          label: 'base',
          input_unit_cost: 10,
          output_unit_cost: 20,
          cache_read_unit_cost: 5,
        }),
      ],
    }
    const expr = generateExprFromVisualConfig(config)
    expect(expr).toContain('cr * 5')
  })
})

describe('tryParseVisualConfig', () => {
  test('returns null for null input', () => {
    expect(tryParseVisualConfig(null)).toBeNull()
  })

  test('returns null for undefined input', () => {
    expect(tryParseVisualConfig(undefined)).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(tryParseVisualConfig('')).toBeNull()
  })

  test('parses a single tier expression', () => {
    const config = tryParseVisualConfig('tier("base", p * 10 + c * 20)')
    expect(config).not.toBeNull()
    expect(config!.tiers).toHaveLength(1)
    expect(config!.tiers[0].label).toBe('base')
    expect(config!.tiers[0].input_unit_cost).toBe(10)
    expect(config!.tiers[0].output_unit_cost).toBe(20)
  })

  test('round-trips through generate and parse', () => {
    const original: VisualConfig = {
      tiers: [makeTier({ label: 'base', input_unit_cost: 10, output_unit_cost: 20 })],
    }
    const expr = generateExprFromVisualConfig(original)
    const parsed = tryParseVisualConfig(expr)
    expect(parsed).not.toBeNull()
    expect(parsed!.tiers[0].input_unit_cost).toBe(10)
    expect(parsed!.tiers[0].output_unit_cost).toBe(20)
  })

  test('returns null for unparseable expression', () => {
    expect(tryParseVisualConfig('random garbage')).toBeNull()
  })

  test('handles versioned expression', () => {
    const config = tryParseVisualConfig('v2:tier("base", p * 10 + c * 20)')
    expect(config).not.toBeNull()
    expect(config!.tiers[0].label).toBe('base')
  })

  test('returns null when regeneration does not match original', () => {
    const result = tryParseVisualConfig(
      'tier("a", p * 1 + c * 2) : tier("b", p * 3 + c * 4) : tier("c", p * 5 + c * 6)'
    )
    if (result === null) {
      expect(result).toBeNull()
    } else {
      const regenerated = generateExprFromVisualConfig(result)
      const original = 'tier("a", p * 1 + c * 2) : tier("b", p * 3 + c * 4) : tier("c", p * 5 + c * 6)'
      expect(regenerated.replace(/\s+/g, '')).toBe(original.replace(/\s+/g, ''))
    }
  })
})

describe('evalExprLocally', () => {
  test('evaluates simple expression', () => {
    const result = evalExprLocally('p * 10 + c * 20', 100, 50, ZERO_EXTRAS)
    expect(result.cost).toBe(100 * 10 + 50 * 20)
    expect(result.error).toBeNull()
  })

  test('returns zero cost for empty expression', () => {
    const result = evalExprLocally('', 100, 50, ZERO_EXTRAS)
    expect(result.cost).toBe(0)
    expect(result.error).toBeNull()
  })

  test('returns zero cost for whitespace expression', () => {
    const result = evalExprLocally('   ', 100, 50, ZERO_EXTRAS)
    expect(result.cost).toBe(0)
    expect(result.error).toBeNull()
  })

  test('captures tier name from tier function', () => {
    const result = evalExprLocally(
      'tier("premium", p * 10 + c * 20)',
      100,
      50,
      ZERO_EXTRAS
    )
    expect(result.matchedTier).toBe('premium')
    expect(result.cost).toBe(100 * 10 + 50 * 20)
  })

  test('uses extra token values', () => {
    const extras: ExtraTokenValues = {
      ...ZERO_EXTRAS,
      cacheReadTokens: 200,
    }
    const result = evalExprLocally('cr * 5', 100, 50, extras)
    expect(result.cost).toBe(200 * 5)
  })

  test('computes len as sum of prompt + cache tokens', () => {
    const extras: ExtraTokenValues = {
      ...ZERO_EXTRAS,
      cacheReadTokens: 10,
      cacheCreateTokens: 20,
      cacheCreate1hTokens: 30,
    }
    const result = evalExprLocally('len', 100, 50, extras)
    expect(result.cost).toBe(100 + 10 + 20 + 30)
  })

  test('returns error for invalid expression', () => {
    const result = evalExprLocally('invalid!!!', 100, 50, ZERO_EXTRAS)
    expect(result.error).not.toBeNull()
    expect(result.cost).toBe(0)
  })

  test('provides math functions', () => {
    const result = evalExprLocally('max(p, c)', 100, 200, ZERO_EXTRAS)
    expect(result.cost).toBe(200)
  })

  test('returns 0 cost for NaN result', () => {
    const result = evalExprLocally('p / 0 - p / 0', 100, 50, ZERO_EXTRAS)
    expect(result.cost).toBe(0)
  })
})

describe('exprUsesExtraVars', () => {
  test('returns true when expression contains extra var', () => {
    expect(exprUsesExtraVars('p * 10 + cr * 5')).toBe(true)
  })

  test('returns true for cache create var', () => {
    expect(exprUsesExtraVars('cc * 3')).toBe(true)
  })

  test('returns true for image var', () => {
    expect(exprUsesExtraVars('img * 2')).toBe(true)
  })

  test('returns true for audio vars', () => {
    expect(exprUsesExtraVars('ai * 1 + ao * 2')).toBe(true)
  })

  test('returns false when only base vars are used', () => {
    expect(exprUsesExtraVars('p * 10 + c * 20')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(exprUsesExtraVars('')).toBe(false)
  })

  test('returns false for null-like input', () => {
    expect(exprUsesExtraVars(null as unknown as string)).toBe(false)
  })
})

import {
  parseHeaderNavBoolean,
  parseHeaderNavModules,
  parseHeaderNavModulesFromStatus,
  getModuleAccessFromStatus,
} from './nav-modules'

vi.mock('@/lib/api', () => ({
  getStatus: vi.fn(),
}))

describe('parseHeaderNavBoolean', () => {
  test('returns boolean value directly', () => {
    expect(parseHeaderNavBoolean(true, false)).toBe(true)
    expect(parseHeaderNavBoolean(false, true)).toBe(false)
  })

  test('parses number 1 as true and 0 as false', () => {
    expect(parseHeaderNavBoolean(1, false)).toBe(true)
    expect(parseHeaderNavBoolean(0, true)).toBe(false)
  })

  test('returns fallback for other numbers', () => {
    expect(parseHeaderNavBoolean(2, true)).toBe(true)
    expect(parseHeaderNavBoolean(-1, false)).toBe(false)
  })

  test('parses string "true" and "1" as true', () => {
    expect(parseHeaderNavBoolean('true', false)).toBe(true)
    expect(parseHeaderNavBoolean('1', false)).toBe(true)
    expect(parseHeaderNavBoolean('TRUE', false)).toBe(true)
    expect(parseHeaderNavBoolean(' True ', false)).toBe(true)
  })

  test('parses string "false" and "0" as false', () => {
    expect(parseHeaderNavBoolean('false', true)).toBe(false)
    expect(parseHeaderNavBoolean('0', true)).toBe(false)
    expect(parseHeaderNavBoolean('FALSE', true)).toBe(false)
    expect(parseHeaderNavBoolean(' False ', true)).toBe(false)
  })

  test('returns fallback for unrecognized string', () => {
    expect(parseHeaderNavBoolean('yes', true)).toBe(true)
    expect(parseHeaderNavBoolean('no', false)).toBe(false)
    expect(parseHeaderNavBoolean('', true)).toBe(true)
  })

  test('returns fallback for null/undefined', () => {
    expect(parseHeaderNavBoolean(null, true)).toBe(true)
    expect(parseHeaderNavBoolean(undefined, false)).toBe(false)
  })
})

describe('parseHeaderNavModules', () => {
  test('returns defaults for null/undefined input', () => {
    const result = parseHeaderNavModules(null)
    expect(result.home).toBe(true)
    expect(result.console).toBe(true)
    expect(result.docs).toBe(true)
    expect(result.about).toBe(true)
    expect(result.pricing).toEqual({ enabled: true, requireAuth: false })
    expect(result.rankings).toEqual({ enabled: true, requireAuth: false })
  })

  test('returns defaults for empty string', () => {
    const result = parseHeaderNavModules('')
    expect(result.home).toBe(true)
    expect(result.console).toBe(true)
  })

  test('returns defaults for whitespace-only string', () => {
    const result = parseHeaderNavModules('   ')
    expect(result.home).toBe(true)
  })

  test('parses JSON string input', () => {
    const result = parseHeaderNavModules(
      JSON.stringify({ home: false, docs: false })
    )
    expect(result.home).toBe(false)
    expect(result.docs).toBe(false)
    expect(result.console).toBe(true)
  })

  test('parses object input directly', () => {
    const result = parseHeaderNavModules({ home: false, about: false })
    expect(result.home).toBe(false)
    expect(result.about).toBe(false)
    expect(result.console).toBe(true)
  })

  test('parses pricing as boolean to set enabled only', () => {
    const result = parseHeaderNavModules({ pricing: false })
    expect(result.pricing).toEqual({ enabled: false, requireAuth: false })
  })

  test('parses pricing as object with enabled and requireAuth', () => {
    const result = parseHeaderNavModules({
      pricing: { enabled: true, requireAuth: true },
    })
    expect(result.pricing).toEqual({ enabled: true, requireAuth: true })
  })

  test('parses rankings as string "0" to set enabled false', () => {
    const result = parseHeaderNavModules({ rankings: '0' })
    expect(result.rankings).toEqual({ enabled: false, requireAuth: false })
  })

  test('parses rankings as object', () => {
    const result = parseHeaderNavModules({
      rankings: { enabled: false, requireAuth: true },
    })
    expect(result.rankings).toEqual({ enabled: false, requireAuth: true })
  })

  test('handles invalid JSON string gracefully', () => {
    const result = parseHeaderNavModules('not valid json')
    expect(result.home).toBe(true)
  })

  test('handles extra unknown boolean keys', () => {
    const result = parseHeaderNavModules({ custom_feature: false })
    expect(result.custom_feature).toBe(false)
    expect(result.home).toBe(true)
  })

  test('handles number values for boolean keys', () => {
    const result = parseHeaderNavModules({ home: 0, console: 1 })
    expect(result.home).toBe(false)
    expect(result.console).toBe(true)
  })

  test('handles string values for boolean keys', () => {
    const result = parseHeaderNavModules({ home: 'false', about: 'true' })
    expect(result.home).toBe(false)
    expect(result.about).toBe(true)
  })
})

describe('parseHeaderNavModulesFromStatus', () => {
  test('extracts HeaderNavModules from status object', () => {
    const status = {
      HeaderNavModules: { home: false },
    }
    const result = parseHeaderNavModulesFromStatus(status)
    expect(result.home).toBe(false)
    expect(result.console).toBe(true)
  })

  test('returns defaults for null status', () => {
    const result = parseHeaderNavModulesFromStatus(null)
    expect(result.home).toBe(true)
    expect(result.pricing).toEqual({ enabled: true, requireAuth: false })
  })

  test('returns defaults when HeaderNavModules is missing', () => {
    const result = parseHeaderNavModulesFromStatus({})
    expect(result.home).toBe(true)
  })
})

describe('getModuleAccessFromStatus', () => {
  test('returns parsed access for pricing', () => {
    const status = {
      HeaderNavModules: {
        pricing: { enabled: false, requireAuth: true },
      },
    }
    const result = getModuleAccessFromStatus(status, 'pricing')
    expect(result).toEqual({ enabled: false, requireAuth: true })
  })

  test('returns parsed access for rankings', () => {
    const status = {
      HeaderNavModules: {
        rankings: false,
      },
    }
    const result = getModuleAccessFromStatus(status, 'rankings')
    expect(result).toEqual({ enabled: false, requireAuth: false })
  })

  test('returns defaults when status is null', () => {
    const result = getModuleAccessFromStatus(null, 'pricing')
    expect(result).toEqual({ enabled: true, requireAuth: false })
  })

  test('returns defaults when module not specified in status', () => {
    const result = getModuleAccessFromStatus({}, 'rankings')
    expect(result).toEqual({ enabled: true, requireAuth: false })
  })
})

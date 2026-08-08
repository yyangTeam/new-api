import {
  parseHeaderNavModules,
  serializeHeaderNavModules,
  parseSidebarModulesAdmin,
  serializeSidebarModulesAdmin,
  HEADER_NAV_DEFAULT,
  SIDEBAR_MODULES_DEFAULT,
} from './config'

describe('parseHeaderNavModules', () => {
  test('returns defaults for null input', () => {
    const result = parseHeaderNavModules(null)
    expect(result.home).toBe(true)
    expect(result.console).toBe(true)
    expect(result.pricing).toEqual({ enabled: true, requireAuth: false })
    expect(result.rankings).toEqual({ enabled: true, requireAuth: false })
    expect(result.docs).toBe(true)
    expect(result.about).toBe(true)
  })

  test('returns defaults for undefined input', () => {
    const result = parseHeaderNavModules(undefined)
    expect(result.home).toBe(true)
  })

  test('returns defaults for empty string', () => {
    const result = parseHeaderNavModules('')
    expect(result.home).toBe(true)
  })

  test('parses boolean overrides', () => {
    const result = parseHeaderNavModules(JSON.stringify({ home: false, docs: false }))
    expect(result.home).toBe(false)
    expect(result.docs).toBe(false)
    expect(result.console).toBe(true)
  })

  test('parses pricing as boolean', () => {
    const result = parseHeaderNavModules(JSON.stringify({ pricing: false }))
    expect(result.pricing).toEqual({ enabled: false, requireAuth: false })
  })

  test('parses pricing as object', () => {
    const result = parseHeaderNavModules(
      JSON.stringify({ pricing: { enabled: true, requireAuth: true } })
    )
    expect(result.pricing).toEqual({ enabled: true, requireAuth: true })
  })

  test('parses rankings as boolean', () => {
    const result = parseHeaderNavModules(JSON.stringify({ rankings: true }))
    expect(result.rankings).toEqual({ enabled: true, requireAuth: false })
  })

  test('parses string values as booleans', () => {
    const result = parseHeaderNavModules(
      JSON.stringify({ home: 'true', docs: 'false' })
    )
    expect(result.home).toBe(true)
    expect(result.docs).toBe(false)
  })

  test('parses numeric values as booleans', () => {
    const result = parseHeaderNavModules(
      JSON.stringify({ home: 1, docs: 0 })
    )
    expect(result.home).toBe(true)
    expect(result.docs).toBe(false)
  })

  test('returns defaults for invalid JSON', () => {
    const result = parseHeaderNavModules('not-json')
    expect(result.home).toBe(true)
  })
})

describe('serializeHeaderNavModules', () => {
  test('serializes config to JSON string', () => {
    const config = { ...HEADER_NAV_DEFAULT }
    const result = serializeHeaderNavModules(config)
    expect(JSON.parse(result)).toEqual(config)
  })
})

describe('parseSidebarModulesAdmin', () => {
  test('returns defaults for null input', () => {
    const result = parseSidebarModulesAdmin(null)
    expect(result.chat).toBeDefined()
    expect(result.chat.enabled).toBe(true)
    expect(result.console).toBeDefined()
    expect(result.admin).toBeDefined()
  })

  test('returns defaults for empty string', () => {
    const result = parseSidebarModulesAdmin('')
    expect(result.chat.enabled).toBe(true)
  })

  test('returns defaults for whitespace-only string', () => {
    const result = parseSidebarModulesAdmin('   ')
    expect(result.chat.enabled).toBe(true)
  })

  test('parses section overrides', () => {
    const input = JSON.stringify({
      chat: { enabled: false, playground: false, chat: true },
    })
    const result = parseSidebarModulesAdmin(input)
    expect(result.chat.enabled).toBe(false)
    expect(result.chat.playground).toBe(false)
    expect(result.chat.chat).toBe(true)
  })

  test('merges missing sections from defaults', () => {
    const input = JSON.stringify({
      chat: { enabled: true, playground: true, chat: true },
    })
    const result = parseSidebarModulesAdmin(input)
    expect(result.console).toBeDefined()
    expect(result.admin).toBeDefined()
    expect(result.personal).toBeDefined()
  })

  test('merges missing modules within section', () => {
    const input = JSON.stringify({
      console: { enabled: true },
    })
    const result = parseSidebarModulesAdmin(input)
    expect(result.console.detail).toBe(true)
    expect(result.console.token).toBe(true)
  })

  test('returns defaults for invalid JSON', () => {
    const result = parseSidebarModulesAdmin('invalid-json')
    expect(result.chat.enabled).toBe(true)
  })

  test('ignores non-object sections', () => {
    const input = JSON.stringify({
      chat: 'not-an-object',
      console: { enabled: true },
    })
    const result = parseSidebarModulesAdmin(input)
    expect(result.chat.enabled).toBe(true)
  })
})

describe('serializeSidebarModulesAdmin', () => {
  test('serializes config to JSON string', () => {
    const config = { ...SIDEBAR_MODULES_DEFAULT }
    const result = serializeSidebarModulesAdmin(config)
    expect(JSON.parse(result)).toEqual(config)
  })
})

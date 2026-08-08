import {
  DEFAULT_PAGE_SIZE,
  getNameRuleOptions,
  getNameRuleConfig,
  getModelStatusOptions,
  getModelStatusConfig,
  getSyncStatusOptions,
  getDeploymentStatusOptions,
  getDeploymentStatusConfig,
  getQuotaTypeConfig,
  ENDPOINT_TEMPLATES,
  getSyncLocaleOptions,
  getSyncSourceOptions,
} from './constants'

const t = ((key: string) => key) as any

describe('DEFAULT_PAGE_SIZE', () => {
  test('equals 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20)
  })
})

describe('getNameRuleOptions', () => {
  test('returns 4 options', () => {
    const options = getNameRuleOptions(t)
    expect(options).toHaveLength(4)
  })

  test('first option is Exact Match with value 0', () => {
    const options = getNameRuleOptions(t)
    expect(options[0]).toEqual({ label: 'Exact Match', value: 0 })
  })

  test('includes all match types', () => {
    const options = getNameRuleOptions(t)
    const labels = options.map((o) => o.label)
    expect(labels).toEqual(['Exact Match', 'Prefix Match', 'Contains Match', 'Suffix Match'])
  })

  test('values are 0,1,2,3', () => {
    const options = getNameRuleOptions(t)
    expect(options.map((o) => o.value)).toEqual([0, 1, 2, 3])
  })
})

describe('getNameRuleConfig', () => {
  test('returns config for all 4 rules', () => {
    const config = getNameRuleConfig(t)
    expect(Object.keys(config)).toHaveLength(4)
  })

  test('each entry has label, color, and description', () => {
    const config = getNameRuleConfig(t)
    for (const key of [0, 1, 2, 3] as const) {
      expect(config[key]).toHaveProperty('label')
      expect(config[key]).toHaveProperty('color')
      expect(config[key]).toHaveProperty('description')
    }
  })

  test('exact rule has green color', () => {
    const config = getNameRuleConfig(t)
    expect(config[0].color).toBe('green')
  })
})

describe('getModelStatusOptions', () => {
  test('returns 3 options', () => {
    const options = getModelStatusOptions(t)
    expect(options).toHaveLength(3)
  })

  test('includes All Status, Enabled, and Disabled', () => {
    const options = getModelStatusOptions(t)
    expect(options.map((o) => o.label)).toEqual(['All Status', 'Enabled', 'Disabled'])
  })

  test('values are all, enabled, disabled', () => {
    const options = getModelStatusOptions(t)
    expect(options.map((o) => o.value)).toEqual(['all', 'enabled', 'disabled'])
  })
})

describe('getModelStatusConfig', () => {
  test('returns config for status 0 and 1', () => {
    const config = getModelStatusConfig(t)
    expect(config[1]).toEqual({ label: 'Enabled', variant: 'success' })
    expect(config[0]).toEqual({ label: 'Disabled', variant: 'neutral' })
  })
})

describe('getSyncStatusOptions', () => {
  test('returns 3 options', () => {
    const options = getSyncStatusOptions(t)
    expect(options).toHaveLength(3)
  })

  test('includes All Sync Status, Official Sync, No Sync', () => {
    const options = getSyncStatusOptions(t)
    expect(options.map((o) => o.label)).toEqual(['All Sync Status', 'Official Sync', 'No Sync'])
  })
})

describe('getDeploymentStatusOptions', () => {
  test('returns 7 options', () => {
    const options = getDeploymentStatusOptions(t)
    expect(options).toHaveLength(7)
  })

  test('first option is All Status with value all', () => {
    const options = getDeploymentStatusOptions(t)
    expect(options[0]).toEqual({ label: 'All Status', value: 'all' })
  })
})

describe('getDeploymentStatusConfig', () => {
  test('running has success variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['running'].variant).toBe('success')
  })

  test('failed has danger variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['failed'].variant).toBe('danger')
  })

  test('error has danger variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['error'].variant).toBe('danger')
  })

  test('deployment requested has warning variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['deployment requested'].variant).toBe('warning')
  })

  test('termination requested has warning variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['termination requested'].variant).toBe('warning')
  })

  test('destroyed has danger variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['destroyed'].variant).toBe('danger')
  })

  test('completed has success variant', () => {
    const config = getDeploymentStatusConfig(t)
    expect(config['completed'].variant).toBe('success')
  })
})

describe('getQuotaTypeConfig', () => {
  test('returns config for types 0 and 1', () => {
    const config = getQuotaTypeConfig(t)
    expect(config[0]).toEqual({ label: 'Usage-based', color: 'violet' })
    expect(config[1]).toEqual({ label: 'Per-call', color: 'teal' })
  })
})

describe('ENDPOINT_TEMPLATES', () => {
  test('has openai template', () => {
    expect(ENDPOINT_TEMPLATES.openai).toEqual({
      path: '/v1/chat/completions',
      method: 'POST',
    })
  })

  test('has anthropic template', () => {
    expect(ENDPOINT_TEMPLATES.anthropic).toEqual({
      path: '/v1/messages',
      method: 'POST',
    })
  })

  test('has gemini template', () => {
    expect(ENDPOINT_TEMPLATES.gemini.path).toContain('generateContent')
  })

  test('all templates use POST method', () => {
    Object.values(ENDPOINT_TEMPLATES).forEach((tmpl) => {
      expect(tmpl.method).toBe('POST')
    })
  })
})

describe('getSyncLocaleOptions', () => {
  test('returns 3 locale options', () => {
    const options = getSyncLocaleOptions(t)
    expect(options).toHaveLength(3)
  })

  test('includes zh, en, ja values', () => {
    const options = getSyncLocaleOptions(t)
    expect(options.map((o) => o.value)).toEqual(['zh', 'en', 'ja'])
  })
})

describe('getSyncSourceOptions', () => {
  test('returns 2 source options', () => {
    const options = getSyncSourceOptions(t)
    expect(options).toHaveLength(2)
  })

  test('official is not disabled', () => {
    const options = getSyncSourceOptions(t)
    const official = options.find((o) => o.value === 'official')
    expect(official!.disabled).toBe(false)
  })

  test('config is disabled', () => {
    const options = getSyncSourceOptions(t)
    const config = options.find((o) => o.value === 'config')
    expect(config!.disabled).toBe(true)
  })
})

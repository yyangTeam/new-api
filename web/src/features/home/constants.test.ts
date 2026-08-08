import {
  MAIN_BASE_CLASSES,
  AI_APPLICATIONS,
  AI_MODELS,
  GATEWAY_FEATURES,
  DEFAULT_STATS,
  DEFAULT_FEATURES,
  getGatewayFeatures,
  getDefaultStats,
  getDefaultFeatures,
} from './constants'

const t = ((key: string) => key) as any

describe('MAIN_BASE_CLASSES', () => {
  test('contains expected Tailwind classes', () => {
    expect(MAIN_BASE_CLASSES).toContain('bg-background')
    expect(MAIN_BASE_CLASSES).toContain('text-foreground')
    expect(MAIN_BASE_CLASSES).toContain('w-full')
  })
})

describe('AI_APPLICATIONS', () => {
  test('has 4 entries', () => {
    expect(AI_APPLICATIONS).toHaveLength(4)
  })

  test('includes known applications', () => {
    expect(AI_APPLICATIONS).toContain('Cline')
    expect(AI_APPLICATIONS).toContain('Dify.Color')
  })
})

describe('AI_MODELS', () => {
  test('has 6 entries', () => {
    expect(AI_MODELS).toHaveLength(6)
  })

  test('includes known model brands', () => {
    expect(AI_MODELS).toContain('OpenAI')
    expect(AI_MODELS).toContain('Claude.Color')
    expect(AI_MODELS).toContain('Gemini.Color')
  })
})

describe('GATEWAY_FEATURES', () => {
  test('has 10 entries', () => {
    expect(GATEWAY_FEATURES).toHaveLength(10)
  })

  test('includes Cost Tracking and Load Balancing', () => {
    expect(GATEWAY_FEATURES).toContain('Cost Tracking')
    expect(GATEWAY_FEATURES).toContain('Load Balancing')
  })
})

describe('DEFAULT_STATS', () => {
  test('has 4 entries', () => {
    expect(DEFAULT_STATS).toHaveLength(4)
  })

  test('each stat has value, suffix, and description', () => {
    DEFAULT_STATS.forEach((stat) => {
      expect(stat).toHaveProperty('value')
      expect(stat).toHaveProperty('suffix')
      expect(stat).toHaveProperty('description')
    })
  })

  test('first stat has value 50', () => {
    expect(DEFAULT_STATS[0].value).toBe('50')
  })
})

describe('DEFAULT_FEATURES', () => {
  test('has 8 entries', () => {
    expect(DEFAULT_FEATURES).toHaveLength(8)
  })

  test('each feature has title, description, and iconName', () => {
    DEFAULT_FEATURES.forEach((feature) => {
      expect(feature).toHaveProperty('title')
      expect(feature).toHaveProperty('description')
      expect(feature).toHaveProperty('iconName')
    })
  })
})

describe('getGatewayFeatures', () => {
  test('returns translated feature strings', () => {
    const features = getGatewayFeatures(t)
    expect(features).toHaveLength(10)
    expect(features[0]).toBe('Cost Tracking')
  })

  test('returns same number of features as GATEWAY_FEATURES', () => {
    const features = getGatewayFeatures(t)
    expect(features.length).toBe(GATEWAY_FEATURES.length)
  })
})

describe('getDefaultStats', () => {
  test('returns translated stats', () => {
    const stats = getDefaultStats(t)
    expect(stats).toHaveLength(4)
  })

  test('preserves value and suffix from original', () => {
    const stats = getDefaultStats(t)
    expect(stats[0].value).toBe('50')
    expect(stats[0].suffix).toBe('+')
  })

  test('translates description', () => {
    const stats = getDefaultStats(t)
    expect(stats[0].description).toBe('upstream services integrated')
  })
})

describe('getDefaultFeatures', () => {
  test('returns translated features', () => {
    const features = getDefaultFeatures(t)
    expect(features).toHaveLength(8)
  })

  test('preserves iconName from original', () => {
    const features = getDefaultFeatures(t)
    expect(features[0].iconName).toBe('Zap')
  })

  test('translates title and description', () => {
    const features = getDefaultFeatures(t)
    expect(features[0].title).toBe('Lightning Fast')
    expect(features[0].description).toBe(
      'Optimized network architecture ensures millisecond response times'
    )
  })
})

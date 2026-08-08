import {
  getSortLabels,
  getQuotaTypeLabels,
  getEndpointTypeLabels,
  SORT_OPTIONS,
  QUOTA_TYPES,
  ENDPOINT_TYPES,
  FILTER_ALL,
  FILTER_SECTIONS,
  MAX_TAGS_DISPLAY,
  MAX_FILTER_ITEMS,
  SIDEBAR_WIDTH,
  EXCLUDED_GROUPS,
  QUOTA_TYPE_VALUES,
  TOKEN_UNIT_DIVISORS,
  DEFAULT_TOKEN_UNIT,
  VIEW_MODES,
  DEFAULT_PRICING_PAGE_SIZE,
} from './constants'

const t = ((key: string) => key) as any

describe('getSortLabels', () => {
  test('returns labels for all sort options', () => {
    const labels = getSortLabels(t)
    expect(labels[SORT_OPTIONS.NAME]).toBe('Name')
    expect(labels[SORT_OPTIONS.PRICE_LOW]).toBe('Price: Low to High')
    expect(labels[SORT_OPTIONS.PRICE_HIGH]).toBe('Price: High to Low')
  })

  test('has exactly 3 entries', () => {
    const labels = getSortLabels(t)
    expect(Object.keys(labels)).toHaveLength(3)
  })
})

describe('getQuotaTypeLabels', () => {
  test('returns labels for all quota type options', () => {
    const labels = getQuotaTypeLabels(t)
    expect(labels[QUOTA_TYPES.ALL]).toBe('All Models')
    expect(labels[QUOTA_TYPES.TOKEN]).toBe('Token-based')
    expect(labels[QUOTA_TYPES.REQUEST]).toBe('Per Request')
  })

  test('has exactly 3 entries', () => {
    const labels = getQuotaTypeLabels(t)
    expect(Object.keys(labels)).toHaveLength(3)
  })
})

describe('getEndpointTypeLabels', () => {
  test('returns labels for all endpoint types', () => {
    const labels = getEndpointTypeLabels(t)
    expect(labels[ENDPOINT_TYPES.ALL]).toBe('All Types')
    expect(labels[ENDPOINT_TYPES.OPENAI]).toBe('Chat')
    expect(labels[ENDPOINT_TYPES.OPENAI_RESPONSE]).toBe('Response')
    expect(labels[ENDPOINT_TYPES.ANTHROPIC]).toBe('Anthropic')
    expect(labels[ENDPOINT_TYPES.GEMINI]).toBe('Gemini')
    expect(labels[ENDPOINT_TYPES.JINA_RERANK]).toBe('Rerank')
    expect(labels[ENDPOINT_TYPES.IMAGE_GENERATION]).toBe('Image')
    expect(labels[ENDPOINT_TYPES.EMBEDDINGS]).toBe('Embeddings')
    expect(labels[ENDPOINT_TYPES.OPENAI_VIDEO]).toBe('Video')
  })

  test('has exactly 9 entries', () => {
    const labels = getEndpointTypeLabels(t)
    expect(Object.keys(labels)).toHaveLength(9)
  })
})

describe('constant values', () => {
  test('FILTER_ALL is "all"', () => {
    expect(FILTER_ALL).toBe('all')
  })

  test('MAX_TAGS_DISPLAY is 5', () => {
    expect(MAX_TAGS_DISPLAY).toBe(5)
  })

  test('MAX_FILTER_ITEMS is 5', () => {
    expect(MAX_FILTER_ITEMS).toBe(5)
  })

  test('SIDEBAR_WIDTH is w-64', () => {
    expect(SIDEBAR_WIDTH).toBe('w-64')
  })

  test('EXCLUDED_GROUPS contains empty string and auto', () => {
    expect(EXCLUDED_GROUPS).toEqual(['', 'auto'])
  })

  test('QUOTA_TYPE_VALUES has TOKEN=0 and REQUEST=1', () => {
    expect(QUOTA_TYPE_VALUES.TOKEN).toBe(0)
    expect(QUOTA_TYPE_VALUES.REQUEST).toBe(1)
  })

  test('TOKEN_UNIT_DIVISORS has M=1 and K=1000', () => {
    expect(TOKEN_UNIT_DIVISORS.M).toBe(1)
    expect(TOKEN_UNIT_DIVISORS.K).toBe(1000)
  })

  test('DEFAULT_TOKEN_UNIT is M', () => {
    expect(DEFAULT_TOKEN_UNIT).toBe('M')
  })

  test('VIEW_MODES has CARD and TABLE', () => {
    expect(VIEW_MODES.CARD).toBe('card')
    expect(VIEW_MODES.TABLE).toBe('table')
  })

  test('DEFAULT_PRICING_PAGE_SIZE is 20', () => {
    expect(DEFAULT_PRICING_PAGE_SIZE).toBe(20)
  })

  test('FILTER_SECTIONS has expected keys', () => {
    expect(FILTER_SECTIONS.PRICING_TYPE).toBe('pricingType')
    expect(FILTER_SECTIONS.ENDPOINT_TYPE).toBe('endpointType')
    expect(FILTER_SECTIONS.VENDOR).toBe('vendor')
    expect(FILTER_SECTIONS.GROUP).toBe('group')
    expect(FILTER_SECTIONS.TAG).toBe('tag')
  })
})

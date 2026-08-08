import {
  useSystemConfigStore,
  getSystemName,
  getLogo,
  getFooterHtml,
  DEFAULT_CURRENCY_CONFIG,
} from './system-config-store'

beforeEach(() => {
  useSystemConfigStore.setState({
    config: {
      systemName: 'New API',
      logo: '/logo.png',
      currency: { ...DEFAULT_CURRENCY_CONFIG },
    },
    loading: true,
    loadedLogoUrl: '/logo.png',
  })
})

describe('useSystemConfigStore', () => {
  describe('initial state', () => {
    test('has default system name', () => {
      expect(useSystemConfigStore.getState().config.systemName).toBe('New API')
    })

    test('has default logo', () => {
      expect(useSystemConfigStore.getState().config.logo).toBe('/logo.png')
    })

    test('has loading true by default', () => {
      expect(useSystemConfigStore.getState().loading).toBe(true)
    })

    test('has default currency config', () => {
      const currency = useSystemConfigStore.getState().config.currency
      expect(currency.displayInCurrency).toBe(true)
      expect(currency.quotaDisplayType).toBe('USD')
      expect(currency.quotaPerUnit).toBe(500000)
      expect(currency.usdExchangeRate).toBe(1)
      expect(currency.customCurrencySymbol).toBe('¤')
      expect(currency.customCurrencyExchangeRate).toBe(1)
    })
  })

  describe('setConfig', () => {
    test('updates system name', () => {
      useSystemConfigStore.getState().setConfig({ systemName: 'My API' })
      expect(useSystemConfigStore.getState().config.systemName).toBe('My API')
    })

    test('updates logo', () => {
      useSystemConfigStore.getState().setConfig({ logo: '/new-logo.png' })
      expect(useSystemConfigStore.getState().config.logo).toBe('/new-logo.png')
    })

    test('updates footer HTML', () => {
      useSystemConfigStore.getState().setConfig({ footerHtml: '<p>Footer</p>' })
      expect(useSystemConfigStore.getState().config.footerHtml).toBe('<p>Footer</p>')
    })

    test('preserves existing config when updating partially', () => {
      useSystemConfigStore.getState().setConfig({ systemName: 'Updated' })
      expect(useSystemConfigStore.getState().config.logo).toBe('/logo.png')
    })

    test('merges currency config partially', () => {
      useSystemConfigStore.getState().setConfig({
        currency: { quotaDisplayType: 'CNY' } as any,
      })
      const currency = useSystemConfigStore.getState().config.currency
      expect(currency.quotaDisplayType).toBe('CNY')
      expect(currency.displayInCurrency).toBe(true)
      expect(currency.quotaPerUnit).toBe(500000)
    })

    test('preserves existing currency when no currency in update', () => {
      useSystemConfigStore.getState().setConfig({
        currency: { quotaDisplayType: 'CNY' } as any,
      })
      useSystemConfigStore.getState().setConfig({ systemName: 'Test' })
      expect(useSystemConfigStore.getState().config.currency.quotaDisplayType).toBe('CNY')
    })
  })

  describe('setLoadedLogoUrl', () => {
    test('updates loaded logo URL', () => {
      useSystemConfigStore.getState().setLoadedLogoUrl('/loaded.png')
      expect(useSystemConfigStore.getState().loadedLogoUrl).toBe('/loaded.png')
    })
  })

  describe('setLoading', () => {
    test('sets loading to false', () => {
      useSystemConfigStore.getState().setLoading(false)
      expect(useSystemConfigStore.getState().loading).toBe(false)
    })

    test('sets loading to true', () => {
      useSystemConfigStore.getState().setLoading(false)
      useSystemConfigStore.getState().setLoading(true)
      expect(useSystemConfigStore.getState().loading).toBe(true)
    })
  })
})

describe('getSystemName', () => {
  test('returns current system name', () => {
    expect(getSystemName()).toBe('New API')
  })

  test('returns updated system name', () => {
    useSystemConfigStore.getState().setConfig({ systemName: 'Custom Name' })
    expect(getSystemName()).toBe('Custom Name')
  })
})

describe('getLogo', () => {
  test('returns current logo', () => {
    expect(getLogo()).toBe('/logo.png')
  })

  test('returns updated logo', () => {
    useSystemConfigStore.getState().setConfig({ logo: '/custom.png' })
    expect(getLogo()).toBe('/custom.png')
  })
})

describe('getFooterHtml', () => {
  test('returns undefined when no footer set', () => {
    expect(getFooterHtml()).toBeUndefined()
  })

  test('returns footer HTML when set', () => {
    useSystemConfigStore.getState().setConfig({ footerHtml: '<footer>test</footer>' })
    expect(getFooterHtml()).toBe('<footer>test</footer>')
  })
})

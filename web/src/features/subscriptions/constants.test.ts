import {
  DURATION_UNITS,
  RESET_PERIODS,
  getDurationUnitOptions,
  getResetPeriodOptions,
} from './constants'

const t = ((key: string) => key) as any

describe('DURATION_UNITS', () => {
  test('has 5 entries', () => {
    expect(DURATION_UNITS).toHaveLength(5)
  })

  test('includes year, month, day, hour, custom', () => {
    const values = DURATION_UNITS.map((u) => u.value)
    expect(values).toEqual(['year', 'month', 'day', 'hour', 'custom'])
  })

  test('each entry has value and labelKey', () => {
    DURATION_UNITS.forEach((u) => {
      expect(u.value).toBeDefined()
      expect(u.labelKey).toBeDefined()
    })
  })
})

describe('RESET_PERIODS', () => {
  test('has 5 entries', () => {
    expect(RESET_PERIODS).toHaveLength(5)
  })

  test('includes never, daily, weekly, monthly, custom', () => {
    const values = RESET_PERIODS.map((p) => p.value)
    expect(values).toEqual(['never', 'daily', 'weekly', 'monthly', 'custom'])
  })

  test('each entry has value and labelKey', () => {
    RESET_PERIODS.forEach((p) => {
      expect(p.value).toBeDefined()
      expect(p.labelKey).toBeDefined()
    })
  })
})

describe('getDurationUnitOptions', () => {
  test('returns mapped options with translated labels', () => {
    const options = getDurationUnitOptions(t)
    expect(options).toHaveLength(5)
  })

  test('first option is year', () => {
    const options = getDurationUnitOptions(t)
    expect(options[0]).toEqual({ value: 'year', label: 'years' })
  })

  test('last option is custom', () => {
    const options = getDurationUnitOptions(t)
    expect(options[4]).toEqual({ value: 'custom', label: 'Custom (seconds)' })
  })

  test('each option has value and label', () => {
    const options = getDurationUnitOptions(t)
    options.forEach((o) => {
      expect(o).toHaveProperty('value')
      expect(o).toHaveProperty('label')
    })
  })
})

describe('getResetPeriodOptions', () => {
  test('returns mapped options with translated labels', () => {
    const options = getResetPeriodOptions(t)
    expect(options).toHaveLength(5)
  })

  test('first option is never / No Reset', () => {
    const options = getResetPeriodOptions(t)
    expect(options[0]).toEqual({ value: 'never', label: 'No Reset' })
  })

  test('last option is custom', () => {
    const options = getResetPeriodOptions(t)
    expect(options[4]).toEqual({ value: 'custom', label: 'Custom (seconds)' })
  })

  test('each option has value and label', () => {
    const options = getResetPeriodOptions(t)
    options.forEach((o) => {
      expect(o).toHaveProperty('value')
      expect(o).toHaveProperty('label')
    })
  })
})

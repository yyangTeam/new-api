import {
  REDEMPTION_STATUS,
  REDEMPTION_STATUS_VALUES,
  REDEMPTION_STATUSES,
  REDEMPTION_FILTER_EXPIRED,
  REDEMPTION_FILTER_VALUES,
  getRedemptionStatusOptions,
  REDEMPTION_VALIDATION,
  ERROR_MESSAGES,
  getRedemptionFormErrorMessages,
  SUCCESS_MESSAGES,
} from './constants'

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts) {
    return Object.entries(opts).reduce(
      (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
      key
    )
  }
  return key
}) as any

describe('REDEMPTION_STATUS', () => {
  test('ENABLED is 1', () => {
    expect(REDEMPTION_STATUS.ENABLED).toBe(1)
  })

  test('DISABLED is 2', () => {
    expect(REDEMPTION_STATUS.DISABLED).toBe(2)
  })

  test('USED is 3', () => {
    expect(REDEMPTION_STATUS.USED).toBe(3)
  })
})

describe('REDEMPTION_STATUS_VALUES', () => {
  test('contains string versions of all status values', () => {
    expect(REDEMPTION_STATUS_VALUES).toContain('1')
    expect(REDEMPTION_STATUS_VALUES).toContain('2')
    expect(REDEMPTION_STATUS_VALUES).toContain('3')
  })

  test('has 3 entries', () => {
    expect(REDEMPTION_STATUS_VALUES).toHaveLength(3)
  })
})

describe('REDEMPTION_STATUSES', () => {
  test('ENABLED has Unused label and success variant', () => {
    expect(REDEMPTION_STATUSES[1].labelKey).toBe('Unused')
    expect(REDEMPTION_STATUSES[1].variant).toBe('success')
  })

  test('DISABLED has Disabled label and neutral variant', () => {
    expect(REDEMPTION_STATUSES[2].labelKey).toBe('Disabled')
    expect(REDEMPTION_STATUSES[2].variant).toBe('neutral')
  })

  test('USED has Used label and neutral variant', () => {
    expect(REDEMPTION_STATUSES[3].labelKey).toBe('Used')
    expect(REDEMPTION_STATUSES[3].variant).toBe('neutral')
  })
})

describe('REDEMPTION_FILTER_EXPIRED', () => {
  test('equals "expired"', () => {
    expect(REDEMPTION_FILTER_EXPIRED).toBe('expired')
  })
})

describe('REDEMPTION_FILTER_VALUES', () => {
  test('includes all status values and expired', () => {
    expect(REDEMPTION_FILTER_VALUES).toEqual(['1', '2', '3', 'expired'])
  })
})

describe('getRedemptionStatusOptions', () => {
  test('returns 4 options (3 statuses + expired)', () => {
    const options = getRedemptionStatusOptions(t)
    expect(options).toHaveLength(4)
  })

  test('includes Unused option', () => {
    const options = getRedemptionStatusOptions(t)
    expect(options.find((o) => o.label === 'Unused')).toBeDefined()
  })

  test('includes Expired option', () => {
    const options = getRedemptionStatusOptions(t)
    const expired = options.find((o) => o.value === 'expired')
    expect(expired).toBeDefined()
    expect(expired!.label).toBe('Expired')
  })

  test('values match status constants', () => {
    const options = getRedemptionStatusOptions(t)
    const values = options.map((o) => o.value)
    expect(values).toContain('1')
    expect(values).toContain('2')
    expect(values).toContain('3')
    expect(values).toContain('expired')
  })
})

describe('REDEMPTION_VALIDATION', () => {
  test('NAME_MIN_LENGTH is 1', () => {
    expect(REDEMPTION_VALIDATION.NAME_MIN_LENGTH).toBe(1)
  })

  test('NAME_MAX_LENGTH is 20', () => {
    expect(REDEMPTION_VALIDATION.NAME_MAX_LENGTH).toBe(20)
  })

  test('COUNT_MIN is 1', () => {
    expect(REDEMPTION_VALIDATION.COUNT_MIN).toBe(1)
  })

  test('COUNT_MAX is 100', () => {
    expect(REDEMPTION_VALIDATION.COUNT_MAX).toBe(100)
  })
})

describe('getRedemptionFormErrorMessages', () => {
  test('NAME_LENGTH_INVALID includes min and max values', () => {
    const messages = getRedemptionFormErrorMessages(t)
    expect(messages.NAME_LENGTH_INVALID).toContain('1')
    expect(messages.NAME_LENGTH_INVALID).toContain('20')
  })

  test('COUNT_INVALID includes min and max values', () => {
    const messages = getRedemptionFormErrorMessages(t)
    expect(messages.COUNT_INVALID).toContain('1')
    expect(messages.COUNT_INVALID).toContain('100')
  })

  test('EXPIRED_TIME_INVALID is a string', () => {
    const messages = getRedemptionFormErrorMessages(t)
    expect(typeof messages.EXPIRED_TIME_INVALID).toBe('string')
  })
})

describe('ERROR_MESSAGES', () => {
  test('has all expected error keys', () => {
    expect(ERROR_MESSAGES.UNEXPECTED).toBeDefined()
    expect(ERROR_MESSAGES.LOAD_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.CREATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.UPDATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.DELETE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.DELETE_INVALID_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.STATUS_UPDATE_FAILED).toBeDefined()
  })
})

describe('SUCCESS_MESSAGES', () => {
  test('has all expected success keys', () => {
    expect(SUCCESS_MESSAGES.REDEMPTION_CREATED).toBeDefined()
    expect(SUCCESS_MESSAGES.REDEMPTION_UPDATED).toBeDefined()
    expect(SUCCESS_MESSAGES.REDEMPTION_DELETED).toBeDefined()
    expect(SUCCESS_MESSAGES.REDEMPTION_ENABLED).toBeDefined()
    expect(SUCCESS_MESSAGES.REDEMPTION_DISABLED).toBeDefined()
    expect(SUCCESS_MESSAGES.COPY_SUCCESS).toBeDefined()
  })
})

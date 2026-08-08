import {
  getRedemptionFormSchema,
  REDEMPTION_FORM_DEFAULT_VALUES,
  transformFormDataToPayload,
  transformRedemptionToFormDefaults,
} from './redemption-form'

vi.mock('@/lib/format', () => ({
  parseQuotaFromDollars: (amount: number) => Math.round(amount * 500000),
  quotaUnitsToDollars: (units: number) => units / 500000,
}))

const t = (key: string, _opts?: Record<string, unknown>) => key

describe('REDEMPTION_FORM_DEFAULT_VALUES', () => {
  test('has correct defaults', () => {
    expect(REDEMPTION_FORM_DEFAULT_VALUES).toEqual({
      name: '',
      quota_dollars: 10,
      expired_time: undefined,
      count: 1,
    })
  })
})

describe('getRedemptionFormSchema', () => {
  const schema = getRedemptionFormSchema(t as never)

  test('accepts valid data', () => {
    const result = schema.safeParse({
      name: 'test-code',
      quota_dollars: 10,
      count: 5,
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty name', () => {
    const result = schema.safeParse({
      name: '',
      quota_dollars: 10,
    })
    expect(result.success).toBe(false)
  })

  test('rejects name exceeding max length', () => {
    const result = schema.safeParse({
      name: 'a'.repeat(21),
      quota_dollars: 10,
    })
    expect(result.success).toBe(false)
  })

  test('rejects negative quota_dollars', () => {
    const result = schema.safeParse({
      name: 'test',
      quota_dollars: -1,
    })
    expect(result.success).toBe(false)
  })

  test('rejects count below minimum', () => {
    const result = schema.safeParse({
      name: 'test',
      quota_dollars: 10,
      count: 0,
    })
    expect(result.success).toBe(false)
  })

  test('rejects count above maximum', () => {
    const result = schema.safeParse({
      name: 'test',
      quota_dollars: 10,
      count: 101,
    })
    expect(result.success).toBe(false)
  })

  test('accepts optional expired_time', () => {
    const result = schema.safeParse({
      name: 'test',
      quota_dollars: 10,
      expired_time: new Date(),
    })
    expect(result.success).toBe(true)
  })
})

describe('transformFormDataToPayload', () => {
  test('transforms form data with expired_time', () => {
    const date = new Date('2025-06-15T12:00:00.000Z')
    const result = transformFormDataToPayload({
      name: 'my-code',
      quota_dollars: 10,
      expired_time: date,
      count: 5,
    })

    expect(result.name).toBe('my-code')
    expect(result.quota).toBe(5000000)
    expect(result.expired_time).toBe(Math.floor(date.getTime() / 1000))
    expect(result.count).toBe(5)
  })

  test('sets expired_time to 0 when not provided', () => {
    const result = transformFormDataToPayload({
      name: 'test',
      quota_dollars: 5,
    })
    expect(result.expired_time).toBe(0)
  })

  test('defaults count to 1 when not provided', () => {
    const result = transformFormDataToPayload({
      name: 'test',
      quota_dollars: 5,
    })
    expect(result.count).toBe(1)
  })
})

describe('transformRedemptionToFormDefaults', () => {
  test('transforms redemption with expired_time', () => {
    const result = transformRedemptionToFormDefaults({
      id: 1,
      user_id: 100,
      name: 'my-code',
      key: 'abc123',
      status: 1,
      quota: 5000000,
      created_time: 1000,
      redeemed_time: 0,
      expired_time: 1718452800,
      used_user_id: 0,
    })

    expect(result.name).toBe('my-code')
    expect(result.quota_dollars).toBe(10)
    expect(result.expired_time).toBeInstanceOf(Date)
    expect(result.expired_time!.getTime()).toBe(1718452800 * 1000)
    expect(result.count).toBe(1)
  })

  test('sets expired_time to undefined when 0', () => {
    const result = transformRedemptionToFormDefaults({
      id: 1,
      user_id: 100,
      name: 'test',
      key: 'key',
      status: 1,
      quota: 500000,
      created_time: 1000,
      redeemed_time: 0,
      expired_time: 0,
      used_user_id: 0,
    })

    expect(result.expired_time).toBeUndefined()
  })
})

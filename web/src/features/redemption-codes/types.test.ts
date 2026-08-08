import { redemptionSchema } from './types'

const validRedemption = {
  id: 1,
  user_id: 42,
  name: 'Welcome Bonus',
  key: 'REDEEM-ABC123',
  status: 1,
  quota: 10000,
  created_time: 1700000000,
  redeemed_time: 0,
  expired_time: 1735689600,
  used_user_id: 0,
}

describe('redemptionSchema', () => {
  test('parses valid redemption data', () => {
    const result = redemptionSchema.safeParse(validRedemption)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.user_id).toBe(42)
      expect(result.data.name).toBe('Welcome Bonus')
      expect(result.data.key).toBe('REDEEM-ABC123')
      expect(result.data.status).toBe(1)
      expect(result.data.quota).toBe(10000)
    }
  })

  test('accepts status 2 (disabled)', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      status: 2,
    })
    expect(result.success).toBe(true)
  })

  test('accepts status 3 (used)', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      status: 3,
    })
    expect(result.success).toBe(true)
  })

  test('accepts expired_time 0 for never expires', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      expired_time: 0,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expired_time).toBe(0)
    }
  })

  test('parses used redemption with redeemed data', () => {
    const used = {
      ...validRedemption,
      status: 3,
      redeemed_time: 1700100000,
      used_user_id: 99,
    }
    const result = redemptionSchema.safeParse(used)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.redeemed_time).toBe(1700100000)
      expect(result.data.used_user_id).toBe(99)
    }
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validRedemption
    const result = redemptionSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required name', () => {
    const { name: _, ...noName } = validRedemption
    const result = redemptionSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  test('rejects missing required key', () => {
    const { key: _, ...noKey } = validRedemption
    const result = redemptionSchema.safeParse(noKey)
    expect(result.success).toBe(false)
  })

  test('rejects missing required quota', () => {
    const { quota: _, ...noQuota } = validRedemption
    const result = redemptionSchema.safeParse(noQuota)
    expect(result.success).toBe(false)
  })

  test('rejects non-number id', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      id: 'abc',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-string name', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      name: 123,
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-number status', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      status: 'enabled',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-number quota', () => {
    const result = redemptionSchema.safeParse({
      ...validRedemption,
      quota: '10000',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing required created_time', () => {
    const { created_time: _, ...noCreated } = validRedemption
    const result = redemptionSchema.safeParse(noCreated)
    expect(result.success).toBe(false)
  })

  test('rejects missing required redeemed_time', () => {
    const { redeemed_time: _, ...noRedeemed } = validRedemption
    const result = redemptionSchema.safeParse(noRedeemed)
    expect(result.success).toBe(false)
  })
})

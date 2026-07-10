import { subscriptionPlanSchema, userSubscriptionSchema } from './types'

const validPlan = {
  id: 1,
  title: 'Pro Plan',
  subtitle: 'For power users',
  price_amount: 9.99,
  currency: 'USD',
  duration_unit: 'month' as const,
  duration_value: 1,
  quota_reset_period: 'monthly' as const,
  enabled: true,
  sort_order: 1,
  max_purchase_per_user: 1,
  total_amount: 100,
}

const validSubscription = {
  id: 1,
  user_id: 42,
  plan_id: 1,
  status: 'active',
  source: 'stripe',
  start_time: 1700000000,
  end_time: 1702592000,
  amount_total: 100,
  amount_used: 25,
  next_reset_time: 1702000000,
}

describe('subscriptionPlanSchema', () => {
  test('parses valid plan with all fields', () => {
    const result = subscriptionPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.title).toBe('Pro Plan')
      expect(result.data.price_amount).toBe(9.99)
      expect(result.data.duration_unit).toBe('month')
      expect(result.data.enabled).toBe(true)
    }
  })

  test('applies default currency to USD', () => {
    const { currency: _, ...noCurrency } = validPlan
    const result = subscriptionPlanSchema.safeParse(noCurrency)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('USD')
    }
  })

  test('applies default allow_balance_pay to true', () => {
    const result = subscriptionPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allow_balance_pay).toBe(true)
    }
  })

  test('applies default allow_wallet_overflow to true', () => {
    const result = subscriptionPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allow_wallet_overflow).toBe(true)
    }
  })

  test('accepts all valid duration_unit values', () => {
    for (const unit of ['year', 'month', 'day', 'hour', 'custom'] as const) {
      const result = subscriptionPlanSchema.safeParse({
        ...validPlan,
        duration_unit: unit,
      })
      expect(result.success).toBe(true)
    }
  })

  test('rejects invalid duration_unit', () => {
    const result = subscriptionPlanSchema.safeParse({
      ...validPlan,
      duration_unit: 'week',
    })
    expect(result.success).toBe(false)
  })

  test('accepts all valid quota_reset_period values', () => {
    for (const period of [
      'never',
      'daily',
      'weekly',
      'monthly',
      'custom',
    ] as const) {
      const result = subscriptionPlanSchema.safeParse({
        ...validPlan,
        quota_reset_period: period,
      })
      expect(result.success).toBe(true)
    }
  })

  test('rejects invalid quota_reset_period', () => {
    const result = subscriptionPlanSchema.safeParse({
      ...validPlan,
      quota_reset_period: 'biweekly',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validPlan
    const result = subscriptionPlanSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required title', () => {
    const { title: _, ...noTitle } = validPlan
    const result = subscriptionPlanSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  test('rejects non-number price_amount', () => {
    const result = subscriptionPlanSchema.safeParse({
      ...validPlan,
      price_amount: '9.99',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-boolean enabled', () => {
    const result = subscriptionPlanSchema.safeParse({
      ...validPlan,
      enabled: 1,
    })
    expect(result.success).toBe(false)
  })

  test('accepts optional fields as undefined', () => {
    const result = subscriptionPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_seconds).toBeUndefined()
      expect(result.data.quota_reset_custom_seconds).toBeUndefined()
      expect(result.data.upgrade_group).toBeUndefined()
      expect(result.data.downgrade_group).toBeUndefined()
      expect(result.data.stripe_price_id).toBeUndefined()
      expect(result.data.creem_product_id).toBeUndefined()
      expect(result.data.waffo_pancake_product_id).toBeUndefined()
    }
  })

  test('parses plan with all optional payment provider ids', () => {
    const result = subscriptionPlanSchema.safeParse({
      ...validPlan,
      stripe_price_id: 'price_123',
      creem_product_id: 'creem_456',
      waffo_pancake_product_id: 'waffo_789',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stripe_price_id).toBe('price_123')
      expect(result.data.creem_product_id).toBe('creem_456')
      expect(result.data.waffo_pancake_product_id).toBe('waffo_789')
    }
  })
})

describe('userSubscriptionSchema', () => {
  test('parses valid subscription', () => {
    const result = userSubscriptionSchema.safeParse(validSubscription)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.user_id).toBe(42)
      expect(result.data.plan_id).toBe(1)
      expect(result.data.status).toBe('active')
      expect(result.data.source).toBe('stripe')
      expect(result.data.amount_total).toBe(100)
      expect(result.data.amount_used).toBe(25)
    }
  })

  test('accepts subscription without optional source', () => {
    const { source: _, ...noSource } = validSubscription
    const result = userSubscriptionSchema.safeParse(noSource)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBeUndefined()
    }
  })

  test('accepts subscription without optional next_reset_time', () => {
    const { next_reset_time: _, ...noReset } = validSubscription
    const result = userSubscriptionSchema.safeParse(noReset)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.next_reset_time).toBeUndefined()
    }
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validSubscription
    const result = userSubscriptionSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required user_id', () => {
    const { user_id: _, ...noUserId } = validSubscription
    const result = userSubscriptionSchema.safeParse(noUserId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required status', () => {
    const { status: _, ...noStatus } = validSubscription
    const result = userSubscriptionSchema.safeParse(noStatus)
    expect(result.success).toBe(false)
  })

  test('rejects non-string status', () => {
    const result = userSubscriptionSchema.safeParse({
      ...validSubscription,
      status: 1,
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-number start_time', () => {
    const result = userSubscriptionSchema.safeParse({
      ...validSubscription,
      start_time: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-number amount_total', () => {
    const result = userSubscriptionSchema.safeParse({
      ...validSubscription,
      amount_total: '100',
    })
    expect(result.success).toBe(false)
  })
})

import {
  getPlanFormSchema,
  PLAN_FORM_DEFAULTS,
  planToFormValues,
  formValuesToPlanPayload,
} from './plan-form'

vi.mock('@/lib/format', () => ({
  parseQuotaFromDollars: (amount: number) => Math.round(amount * 500000),
  quotaUnitsToDollars: (units: number) => units / 500000,
}))

const t = (key: string) => key

describe('PLAN_FORM_DEFAULTS', () => {
  test('has correct default values', () => {
    expect(PLAN_FORM_DEFAULTS.title).toBe('')
    expect(PLAN_FORM_DEFAULTS.price_amount).toBe(0)
    expect(PLAN_FORM_DEFAULTS.duration_unit).toBe('month')
    expect(PLAN_FORM_DEFAULTS.duration_value).toBe(1)
    expect(PLAN_FORM_DEFAULTS.enabled).toBe(true)
    expect(PLAN_FORM_DEFAULTS.allow_balance_pay).toBe(true)
    expect(PLAN_FORM_DEFAULTS.allow_wallet_overflow).toBe(true)
    expect(PLAN_FORM_DEFAULTS.quota_reset_period).toBe('never')
  })
})

describe('getPlanFormSchema', () => {
  const schema = getPlanFormSchema(t as never)

  test('accepts valid data', () => {
    const result = schema.safeParse({
      title: 'Pro Plan',
      price_amount: 9.99,
      duration_unit: 'month',
      duration_value: 1,
      quota_reset_period: 'never',
      enabled: true,
      sort_order: 0,
      allow_balance_pay: true,
      allow_wallet_overflow: true,
      max_purchase_per_user: 0,
      total_amount: 0,
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty title', () => {
    const result = schema.safeParse({
      title: '',
      price_amount: 9.99,
      duration_unit: 'month',
      duration_value: 1,
      quota_reset_period: 'never',
      enabled: true,
      sort_order: 0,
      allow_balance_pay: true,
      allow_wallet_overflow: true,
      max_purchase_per_user: 0,
      total_amount: 0,
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid duration_unit', () => {
    const result = schema.safeParse({
      title: 'Plan',
      price_amount: 10,
      duration_unit: 'invalid',
      duration_value: 1,
      quota_reset_period: 'never',
      enabled: true,
      sort_order: 0,
      allow_balance_pay: true,
      allow_wallet_overflow: true,
      max_purchase_per_user: 0,
      total_amount: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('planToFormValues', () => {
  test('transforms a subscription plan to form values', () => {
    const plan = {
      id: 1,
      title: 'Pro Plan',
      subtitle: 'Best plan',
      price_amount: 9.99,
      currency: 'USD',
      duration_unit: 'month' as const,
      duration_value: 1,
      custom_seconds: 0,
      quota_reset_period: 'monthly' as const,
      quota_reset_custom_seconds: 0,
      enabled: true,
      sort_order: 1,
      allow_balance_pay: true,
      allow_wallet_overflow: false,
      max_purchase_per_user: 5,
      total_amount: 5000000,
      upgrade_group: 'vip',
      downgrade_group: 'default',
      stripe_price_id: 'price_123',
      creem_product_id: '',
      waffo_pancake_product_id: '',
    }

    const result = planToFormValues(plan)
    expect(result.title).toBe('Pro Plan')
    expect(result.subtitle).toBe('Best plan')
    expect(result.price_amount).toBe(9.99)
    expect(result.duration_unit).toBe('month')
    expect(result.duration_value).toBe(1)
    expect(result.enabled).toBe(true)
    expect(result.allow_wallet_overflow).toBe(false)
    expect(result.total_amount).toBe(10)
    expect(result.upgrade_group).toBe('vip')
    expect(result.stripe_price_id).toBe('price_123')
  })

  test('handles missing optional fields', () => {
    const plan = {
      id: 2,
      title: 'Basic',
      price_amount: 0,
      currency: 'USD',
      duration_unit: 'month' as const,
      duration_value: 1,
      enabled: true,
      sort_order: 0,
      max_purchase_per_user: 0,
      total_amount: 0,
      quota_reset_period: 'never' as const,
    }

    const result = planToFormValues(plan)
    expect(result.subtitle).toBe('')
    expect(result.custom_seconds).toBe(0)
    expect(result.upgrade_group).toBe('')
    expect(result.downgrade_group).toBe('')
    expect(result.stripe_price_id).toBe('')
  })

  test('defaults enabled to true when not explicitly false', () => {
    const plan = {
      id: 3,
      title: 'Test',
      price_amount: 0,
      currency: 'USD',
      duration_unit: 'month' as const,
      duration_value: 1,
      enabled: undefined as unknown as boolean,
      sort_order: 0,
      max_purchase_per_user: 0,
      total_amount: 0,
      quota_reset_period: 'never' as const,
    }

    const result = planToFormValues(plan)
    expect(result.enabled).toBe(true)
  })
})

describe('formValuesToPlanPayload', () => {
  test('transforms form values to plan payload', () => {
    const values = {
      ...PLAN_FORM_DEFAULTS,
      title: 'Pro Plan',
      price_amount: 9.99,
      total_amount: 10,
    }

    const result = formValuesToPlanPayload(values)
    expect(result.plan.title).toBe('Pro Plan')
    expect(result.plan.price_amount).toBe(9.99)
    expect(result.plan.currency).toBe('USD')
    expect(result.plan.total_amount).toBe(5000000)
  })

  test('sets quota_reset_custom_seconds to 0 when period is not custom', () => {
    const values = {
      ...PLAN_FORM_DEFAULTS,
      title: 'Test',
      quota_reset_period: 'monthly' as const,
      quota_reset_custom_seconds: 3600,
    }

    const result = formValuesToPlanPayload(values)
    expect(result.plan.quota_reset_custom_seconds).toBe(0)
  })

  test('preserves quota_reset_custom_seconds when period is custom', () => {
    const values = {
      ...PLAN_FORM_DEFAULTS,
      title: 'Test',
      quota_reset_period: 'custom' as const,
      quota_reset_custom_seconds: 7200,
    }

    const result = formValuesToPlanPayload(values)
    expect(result.plan.quota_reset_custom_seconds).toBe(7200)
  })
})

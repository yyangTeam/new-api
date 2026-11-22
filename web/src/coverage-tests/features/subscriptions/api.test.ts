import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getAdminPlans,
  createPlan,
  updatePlan,
  patchPlanStatus,
  getUserSubscriptions,
  createUserSubscription,
  invalidateUserSubscription,
  deleteUserSubscription,
  resetUserSubscriptionsByPlan,
  resetPlanSubscriptions,
  paySubscriptionStripe,
  paySubscriptionCreem,
  paySubscriptionWaffoPancake,
  paySubscriptionBalance,
  createWaffoPancakeSubscriptionProduct,
  listWaffoPancakeSubscriptionProductOptions,
  paySubscriptionEpay,
  getSelfSubscriptions,
  getSelfSubscriptionFull,
  getPublicPlans,
  updateBillingPreference,
  getGroups,
} from '@/features/subscriptions/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('subscriptions/api', () => {
  describe('Admin Plan Management', () => {
    it('getAdminPlans', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const result = await getAdminPlans()
      expect(mockApi.get).toHaveBeenCalledWith('/api/subscription/admin/plans')
      expect(result).toEqual({ success: true, data: [] })
    })

    it('createPlan', async () => {
      const payload = { plan: { title: 'Test Plan' } }
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { plan: { id: 1 } } },
      })
      const result = await createPlan(payload as any)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/admin/plans',
        payload
      )
      expect(result.success).toBe(true)
    })

    it('updatePlan', async () => {
      const payload = { plan: { title: 'Updated' } }
      mockApi.put.mockResolvedValue({
        data: { success: true, data: { plan: { id: 1 } } },
      })
      const result = await updatePlan(1, payload as any)
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/subscription/admin/plans/1',
        payload
      )
      expect(result.success).toBe(true)
    })

    it('patchPlanStatus enables', async () => {
      mockApi.patch.mockResolvedValue({ data: { success: true } })
      await patchPlanStatus(1, true)
      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/subscription/admin/plans/1',
        { enabled: true }
      )
    })

    it('patchPlanStatus disables', async () => {
      mockApi.patch.mockResolvedValue({ data: { success: true } })
      await patchPlanStatus(2, false)
      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/subscription/admin/plans/2',
        { enabled: false }
      )
    })
  })

  describe('Admin User Subscription Management', () => {
    it('getUserSubscriptions', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const result = await getUserSubscriptions(5)
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/subscription/admin/users/5/subscriptions'
      )
      expect(result).toEqual({ success: true, data: [] })
    })

    it('createUserSubscription', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await createUserSubscription(5, { plan_id: 1 })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/admin/users/5/subscriptions',
        { plan_id: 1 }
      )
    })

    it('invalidateUserSubscription', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await invalidateUserSubscription(10)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/admin/user_subscriptions/10/invalidate'
      )
    })

    it('deleteUserSubscription', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } })
      await deleteUserSubscription(10)
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/subscription/admin/user_subscriptions/10'
      )
    })

    it('resetUserSubscriptionsByPlan', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { plan_id: 1, reset_count: 3 } },
      })
      const result = await resetUserSubscriptionsByPlan(5, {
        plan_id: 1,
        advance_reset_time: true,
      })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/admin/users/5/subscriptions/reset',
        { plan_id: 1, advance_reset_time: true }
      )
      expect(result.data?.reset_count).toBe(3)
    })

    it('resetPlanSubscriptions', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { plan_id: 1, reset_count: 5 } },
      })
      const result = await resetPlanSubscriptions(1, {
        advance_reset_time: false,
      })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/admin/plans/1/subscriptions/reset',
        { advance_reset_time: false }
      )
      expect(result.data?.reset_count).toBe(5)
    })
  })

  describe('Payment APIs', () => {
    it('paySubscriptionStripe', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { pay_link: 'https://stripe.com/pay' } },
      })
      const result = await paySubscriptionStripe({ plan_id: 1 })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/stripe/pay',
        { plan_id: 1 }
      )
      expect(result.data?.pay_link).toBe('https://stripe.com/pay')
    })

    it('paySubscriptionCreem', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { checkout_url: 'https://creem.io/pay' } },
      })
      const result = await paySubscriptionCreem({ plan_id: 2 })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/creem/pay',
        { plan_id: 2 }
      )
      expect(result.data?.checkout_url).toBe('https://creem.io/pay')
    })

    it('paySubscriptionWaffoPancake', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { checkout_url: 'https://pancake.io' } },
      })
      const result = await paySubscriptionWaffoPancake({ plan_id: 3 })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/waffo-pancake/pay',
        { plan_id: 3 }
      )
      expect(result.data?.checkout_url).toBe('https://pancake.io')
    })

    it('paySubscriptionBalance', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      const result = await paySubscriptionBalance({ plan_id: 1 })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/balance/pay',
        { plan_id: 1 }
      )
      expect(result.success).toBe(true)
    })

    it('paySubscriptionEpay', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, url: 'https://epay.com/pay' },
      })
      const result = await paySubscriptionEpay({
        plan_id: 1,
        payment_method: 'alipay',
      })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/subscription/epay/pay',
        { plan_id: 1, payment_method: 'alipay' }
      )
      expect(result.url).toBe('https://epay.com/pay')
    })

    it('paySubscriptionEpay uses data.url when top-level url is absent', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, url: 'https://from-data.com' },
      })
      const result = await paySubscriptionEpay({
        plan_id: 1,
        payment_method: 'wechat',
      })
      expect(result.url).toBe('https://from-data.com')
    })
  })

  describe('Waffo Pancake product operations', () => {
    it('createWaffoPancakeSubscriptionProduct', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { product_id: 'prod_1' } },
      })
      const result = await createWaffoPancakeSubscriptionProduct({
        name: 'Test',
        amount: '9.99',
      })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/option/waffo-pancake/subscription-product',
        { name: 'Test', amount: '9.99' }
      )
      expect(result.data?.product_id).toBe('prod_1')
    })

    it('listWaffoPancakeSubscriptionProductOptions', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { store_id: 's1', products: [] } },
      })
      const result = await listWaffoPancakeSubscriptionProductOptions()
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/option/waffo-pancake/subscription-product-options'
      )
      expect(result.data?.store_id).toBe('s1')
    })
  })

  describe('User Self Subscriptions', () => {
    it('getSelfSubscriptions', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const result = await getSelfSubscriptions()
      expect(mockApi.get).toHaveBeenCalledWith('/api/subscription/self')
      expect(result).toEqual({ success: true, data: [] })
    })

    it('getSelfSubscriptionFull', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            billing_preference: 'subscription',
            subscriptions: [],
            all_subscriptions: [],
          },
        },
      })
      const result = await getSelfSubscriptionFull()
      expect(mockApi.get).toHaveBeenCalledWith('/api/subscription/self')
      expect(result.data?.billing_preference).toBe('subscription')
    })

    it('getPublicPlans', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const result = await getPublicPlans()
      expect(mockApi.get).toHaveBeenCalledWith('/api/subscription/plans')
      expect(result).toEqual({ success: true, data: [] })
    })

    it('updateBillingPreference', async () => {
      mockApi.put.mockResolvedValue({
        data: { success: true, data: { billing_preference: 'balance' } },
      })
      const result = await updateBillingPreference('balance')
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/subscription/self/preference',
        { billing_preference: 'balance' }
      )
      expect(result.data?.billing_preference).toBe('balance')
    })

    it('getGroups', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: ['default', 'vip'] },
      })
      const result = await getGroups()
      expect(mockApi.get).toHaveBeenCalledWith('/api/group')
      expect(result.data).toEqual(['default', 'vip'])
    })
  })
})

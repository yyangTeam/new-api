import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import {
  listWaffoPancakeCatalog,
  createWaffoPancakePair,
  saveWaffoPancakeConfig,
} from './waffo-pancake-api'

const mockApi = vi.mocked(api)

describe('waffo-pancake-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listWaffoPancakeCatalog', () => {
    it('calls GET /api/option/waffo-pancake/catalog with params', async () => {
      const mockData = {
        data: {
          stores: [
            { id: 'store1', name: 'Store 1', status: 'active', prodEnabled: true, onetimeProducts: [] },
          ],
        },
      }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await listWaffoPancakeCatalog('merchant-123', 'pk-secret')
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/option/waffo-pancake/catalog',
        { params: { merchant_id: 'merchant-123', private_key: 'pk-secret' } }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('createWaffoPancakePair', () => {
    it('calls POST /api/option/waffo-pancake/pair with body', async () => {
      const mockData = {
        data: {
          store_id: 's1',
          store_name: 'Store',
          product_id: 'p1',
          product_name: 'Product',
        },
      }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await createWaffoPancakePair({
        merchantID: 'm1',
        privateKey: 'key1',
        returnURL: 'https://return.test',
      })
      expect(mockApi.post).toHaveBeenCalledWith('/api/option/waffo-pancake/pair', {
        merchant_id: 'm1',
        private_key: 'key1',
        return_url: 'https://return.test',
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('saveWaffoPancakeConfig', () => {
    it('calls POST /api/option/waffo-pancake/save with body', async () => {
      const mockData = { data: { product_id: 'p1', store_id: 's1' } }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await saveWaffoPancakeConfig({
        merchantID: 'm1',
        privateKey: 'key1',
        returnURL: 'https://return.test',
        storeID: 's1',
        productID: 'p1',
      })
      expect(mockApi.post).toHaveBeenCalledWith('/api/option/waffo-pancake/save', {
        merchant_id: 'm1',
        private_key: 'key1',
        return_url: 'https://return.test',
        store_id: 's1',
        product_id: 'p1',
      })
      expect(result).toEqual(mockData)
    })
  })
})

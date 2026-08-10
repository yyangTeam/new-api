import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import {
  getCustomOAuthProviders,
  getCustomOAuthProvider,
  createCustomOAuthProvider,
  updateCustomOAuthProvider,
  deleteCustomOAuthProvider,
  discoverOIDCEndpoints,
} from './api'

const mockApi = vi.mocked(api)

describe('custom-oauth API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCustomOAuthProviders', () => {
    it('calls GET /api/custom-oauth-provider/', async () => {
      const mockData = { success: true, data: [] }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getCustomOAuthProviders()
      expect(mockApi.get).toHaveBeenCalledWith('/api/custom-oauth-provider/')
      expect(result).toEqual(mockData)
    })
  })

  describe('getCustomOAuthProvider', () => {
    it('calls GET /api/custom-oauth-provider/:id', async () => {
      const mockData = { success: true, data: { id: 5, name: 'GitHub' } }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getCustomOAuthProvider(5)
      expect(mockApi.get).toHaveBeenCalledWith('/api/custom-oauth-provider/5')
      expect(result).toEqual(mockData)
    })
  })

  describe('createCustomOAuthProvider', () => {
    it('calls POST /api/custom-oauth-provider/ with data', async () => {
      const providerData = {
        name: 'Test Provider',
        slug: 'test',
        icon: '',
        enabled: true,
        client_id: 'cid',
        client_secret: 'csecret',
        authorization_endpoint: 'https://auth.test/authorize',
        token_endpoint: 'https://auth.test/token',
        user_info_endpoint: 'https://auth.test/userinfo',
        scopes: 'openid',
        user_id_field: 'sub',
        username_field: 'preferred_username',
        display_name_field: 'name',
        email_field: 'email',
        well_known: '',
        auth_style: 0,
        access_policy: '',
        access_denied_message: '',
      }
      const mockData = { success: true, data: { id: 1, ...providerData } }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await createCustomOAuthProvider(providerData)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/custom-oauth-provider/',
        providerData
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('updateCustomOAuthProvider', () => {
    it('calls PUT /api/custom-oauth-provider/:id with partial data', async () => {
      const updateData = { name: 'Updated', enabled: false }
      const mockData = { success: true, data: { id: 3, ...updateData } }
      mockApi.put.mockResolvedValue({ data: mockData })

      const result = await updateCustomOAuthProvider(3, updateData)
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/custom-oauth-provider/3',
        updateData
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('deleteCustomOAuthProvider', () => {
    it('calls DELETE /api/custom-oauth-provider/:id', async () => {
      const mockData = { success: true }
      mockApi.delete.mockResolvedValue({ data: mockData })

      const result = await deleteCustomOAuthProvider(7)
      expect(mockApi.delete).toHaveBeenCalledWith('/api/custom-oauth-provider/7')
      expect(result).toEqual(mockData)
    })
  })

  describe('discoverOIDCEndpoints', () => {
    it('calls POST /api/custom-oauth-provider/discovery with well_known_url', async () => {
      const mockData = {
        success: true,
        data: {
          well_known_url: 'https://auth.test/.well-known/openid-configuration',
          discovery: {
            authorization_endpoint: 'https://auth.test/authorize',
            token_endpoint: 'https://auth.test/token',
            userinfo_endpoint: 'https://auth.test/userinfo',
          },
        },
      }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await discoverOIDCEndpoints(
        'https://auth.test/.well-known/openid-configuration'
      )
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/custom-oauth-provider/discovery',
        { well_known_url: 'https://auth.test/.well-known/openid-configuration' }
      )
      expect(result).toEqual(mockData)
    })
  })
})

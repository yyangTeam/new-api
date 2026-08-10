import { describe, test, expect, vi, beforeEach } from 'vitest'

import {
  getApiKeys,
  searchApiKeys,
  getApiKey,
  getTokenAutoGroups,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  batchDeleteApiKeys,
  batchUpdateApiKeys,
  updateApiKeyStatus,
  fetchTokenKey,
  fetchTokenKeysBatch,
  batchCreateApiKeys,
} from './api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getApiKeys', () => {
  test('calls with default params', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    const result = await getApiKeys()
    expect(mockApi.get).toHaveBeenCalledWith('/api/token/?p=1&size=10')
    expect(result).toEqual({ success: true })
  })

  test('calls with custom params', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await getApiKeys({ p: 3, size: 25 })
    expect(mockApi.get).toHaveBeenCalledWith('/api/token/?p=3&size=25')
  })
})

describe('searchApiKeys', () => {
  test('builds query with keyword', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchApiKeys({ keyword: 'test' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('keyword=test')
  })

  test('builds query with token', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchApiKeys({ token: 'sk-abc' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('token=sk-abc')
  })

  test('includes p and size when provided', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchApiKeys({ keyword: 'x', p: 2, size: 5 })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('p=2')
    expect(url).toContain('size=5')
  })

  test('omits empty keyword and token', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchApiKeys({ keyword: '', token: '' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).not.toContain('keyword=')
    expect(url).not.toContain('token=')
  })
})

describe('getApiKey', () => {
  test('fetches single key by ID', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { id: 5 } } })
    const result = await getApiKey(5)
    expect(mockApi.get).toHaveBeenCalledWith('/api/token/5')
    expect(result).toEqual({ success: true, data: { id: 5 } })
  })
})

describe('getTokenAutoGroups', () => {
  test('fetches auto groups config', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { groups: ['a'], max_count: 3 } } })
    const result = await getTokenAutoGroups()
    expect(mockApi.get).toHaveBeenCalledWith('/api/token/auto-groups')
    expect(result.data).toEqual({ groups: ['a'], max_count: 3 })
  })
})

describe('createApiKey', () => {
  test('posts new api key data', async () => {
    const data = {
      name: 'test',
      remain_quota: 1000,
      expired_time: -1,
      unlimited_quota: true,
      model_limits_enabled: false,
      model_limits: '',
      allow_ips: '',
      group: '',
      auto_groups: [],
      cross_group_retry: false,
    }
    mockApi.post.mockResolvedValue({ data: { success: true } })
    const result = await createApiKey(data)
    expect(mockApi.post).toHaveBeenCalledWith('/api/token/', data)
    expect(result).toEqual({ success: true })
  })
})

describe('updateApiKey', () => {
  test('puts updated api key data', async () => {
    const data = {
      id: 1,
      name: 'updated',
      remain_quota: 2000,
      expired_time: -1,
      unlimited_quota: false,
      model_limits_enabled: true,
      model_limits: 'gpt-4',
      allow_ips: '',
      group: 'vip',
      auto_groups: [],
      cross_group_retry: true,
    }
    mockApi.put.mockResolvedValue({ data: { success: true } })
    const result = await updateApiKey(data)
    expect(mockApi.put).toHaveBeenCalledWith('/api/token/', data)
    expect(result).toEqual({ success: true })
  })
})

describe('deleteApiKey', () => {
  test('deletes key by ID', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await deleteApiKey(7)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/token/7/')
    expect(result).toEqual({ success: true })
  })
})

describe('batchDeleteApiKeys', () => {
  test('posts batch delete with ids', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: 3 } })
    const result = await batchDeleteApiKeys([1, 2, 3])
    expect(mockApi.post).toHaveBeenCalledWith('/api/token/batch', { ids: [1, 2, 3] })
    expect(result.data).toBe(3)
  })
})

describe('batchUpdateApiKeys', () => {
  test('puts batch update data', async () => {
    const data = { ids: [1, 2], expired_time: 1700000000, group: 'vip' }
    mockApi.put.mockResolvedValue({ data: { success: true, data: 2 } })
    const result = await batchUpdateApiKeys(data)
    expect(mockApi.put).toHaveBeenCalledWith('/api/token/batch', data)
    expect(result.data).toBe(2)
  })
})

describe('updateApiKeyStatus', () => {
  test('puts status-only update', async () => {
    mockApi.put.mockResolvedValue({ data: { success: true } })
    const result = await updateApiKeyStatus(5, 2)
    expect(mockApi.put).toHaveBeenCalledWith('/api/token/?status_only=true', { id: 5, status: 2 })
    expect(result).toEqual({ success: true })
  })
})

describe('fetchTokenKey', () => {
  test('posts to fetch real key', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { key: 'abc123' } } })
    const result = await fetchTokenKey(10)
    expect(mockApi.post).toHaveBeenCalledWith('/api/token/10/key')
    expect(result.data?.key).toBe('abc123')
  })
})

describe('fetchTokenKeysBatch', () => {
  test('posts batch key fetch', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, data: { keys: { '1': 'a', '2': 'b' } } } })
    const result = await fetchTokenKeysBatch([1, 2])
    expect(mockApi.post).toHaveBeenCalledWith('/api/token/batch/keys', { ids: [1, 2] })
    expect(result.data?.keys).toEqual({ '1': 'a', '2': 'b' })
  })
})

describe('batchCreateApiKeys', () => {
  test('posts batch create request', async () => {
    const data = {
      names: ['key1', 'key2'],
      expired_time: -1,
      remain_quota: 0,
      unlimited_quota: true,
      model_limits_enabled: false,
      model_limits: '',
      group: '',
      cross_group_retry: false,
    }
    mockApi.post.mockResolvedValue({ data: { success: true, data: { created: 2, failed: 0 } } })
    const result = await batchCreateApiKeys(data)
    expect(mockApi.post).toHaveBeenCalledWith('/api/token/batch/create', data)
    expect(result.data?.created).toBe(2)
  })
})

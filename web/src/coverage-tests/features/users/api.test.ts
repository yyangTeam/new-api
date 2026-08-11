import { describe, test, expect, vi, beforeEach } from 'vitest'

import {
  getUsers,
  searchUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  manageUser,
  adjustUserQuota,
  resetUserPasskey,
  resetUserTwoFA,
  getGroups,
  getPermissionCatalog,
  getUserOAuthBindings,
  adminClearUserBinding,
  adminUnbindCustomOAuth,
} from '@/features/users/api'

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

describe('getUsers', () => {
  test('calls api.get with default params', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { items: [], total: 0 } } })
    const result = await getUsers()
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/', {
      params: { p: 1, page_size: 10, sort_by: undefined, sort_order: undefined },
    })
    expect(result).toEqual({ success: true, data: { items: [], total: 0 } })
  })

  test('calls api.get with custom params', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await getUsers({ p: 2, page_size: 20, sort_by: 'username', sort_order: 'asc' })
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/', {
      params: { p: 2, page_size: 20, sort_by: 'username', sort_order: 'asc' },
    })
  })
})

describe('searchUsers', () => {
  test('builds query params for keyword search', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchUsers({ keyword: 'john', p: 1, page_size: 10 })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('/api/user/search?')
    expect(url).toContain('keyword=john')
    expect(url).toContain('p=1')
    expect(url).toContain('page_size=10')
  })

  test('includes role and status when provided', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchUsers({ keyword: '', group: 'vip', role: '10', status: '1' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('role=10')
    expect(url).toContain('status=1')
    expect(url).toContain('group=vip')
  })

  test('omits role and status when empty', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchUsers({ keyword: 'test' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).not.toContain('role=')
    expect(url).not.toContain('status=')
  })

  test('includes sort params when provided', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true } })
    await searchUsers({ keyword: '', sort_by: 'quota', sort_order: 'desc' })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('sort_by=quota')
    expect(url).toContain('sort_order=desc')
  })
})

describe('getUser', () => {
  test('fetches a user by ID', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { id: 5 } } })
    const result = await getUser(5)
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/5')
    expect(result).toEqual({ success: true, data: { id: 5 } })
  })
})

describe('createUser', () => {
  test('posts user data', async () => {
    const data = { username: 'test', display_name: 'Test' }
    mockApi.post.mockResolvedValue({ data: { success: true } })
    const result = await createUser(data)
    expect(mockApi.post).toHaveBeenCalledWith('/api/user/', data)
    expect(result).toEqual({ success: true })
  })
})

describe('updateUser', () => {
  test('puts user data with id', async () => {
    const data = { id: 1, username: 'test', display_name: 'Test' }
    mockApi.put.mockResolvedValue({ data: { success: true } })
    const result = await updateUser(data)
    expect(mockApi.put).toHaveBeenCalledWith('/api/user/', data)
    expect(result).toEqual({ success: true })
  })
})

describe('deleteUser', () => {
  test('deletes user by ID', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await deleteUser(3)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/3/')
    expect(result).toEqual({ success: true })
  })
})

describe('manageUser', () => {
  test('posts manage action', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true } })
    const result = await manageUser(7, 'promote')
    expect(mockApi.post).toHaveBeenCalledWith('/api/user/manage', { id: 7, action: 'promote' })
    expect(result).toEqual({ success: true })
  })
})

describe('adjustUserQuota', () => {
  test('posts quota adjustment payload', async () => {
    const payload = { id: 1, action: 'add_quota' as const, mode: 'add' as const, value: 100 }
    mockApi.post.mockResolvedValue({ data: { success: true } })
    const result = await adjustUserQuota(payload)
    expect(mockApi.post).toHaveBeenCalledWith('/api/user/manage', payload)
    expect(result).toEqual({ success: true })
  })
})

describe('resetUserPasskey', () => {
  test('deletes passkey for user', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await resetUserPasskey(10)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/10/reset_passkey')
    expect(result).toEqual({ success: true })
  })
})

describe('resetUserTwoFA', () => {
  test('deletes 2FA for user', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await resetUserTwoFA(10)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/10/2fa')
    expect(result).toEqual({ success: true })
  })
})

describe('getGroups', () => {
  test('fetches groups list', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: ['default', 'vip'] } })
    const result = await getGroups()
    expect(mockApi.get).toHaveBeenCalledWith('/api/group/')
    expect(result).toEqual({ success: true, data: ['default', 'vip'] })
  })
})

describe('getPermissionCatalog', () => {
  test('returns normalized catalog from API', async () => {
    mockApi.get.mockResolvedValue({
      data: { data: { resources: [{ resource: 'channel', actions: [] }], roles: ['admin'] } },
    })
    const result = await getPermissionCatalog()
    expect(result).toEqual({
      resources: [{ resource: 'channel', actions: [] }],
      roles: ['admin'],
    })
  })

  test('returns empty arrays when data is missing', async () => {
    mockApi.get.mockResolvedValue({ data: {} })
    const result = await getPermissionCatalog()
    expect(result).toEqual({ resources: [], roles: [] })
  })

  test('returns empty arrays when data.data is null', async () => {
    mockApi.get.mockResolvedValue({ data: { data: null } })
    const result = await getPermissionCatalog()
    expect(result).toEqual({ resources: [], roles: [] })
  })
})

describe('getUserOAuthBindings', () => {
  test('fetches oauth bindings for user', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
    const result = await getUserOAuthBindings(5)
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/5/oauth/bindings')
    expect(result).toEqual({ success: true, data: [] })
  })
})

describe('adminClearUserBinding', () => {
  test('deletes a binding by type', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await adminClearUserBinding(5, 'github_id')
    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/5/bindings/github_id')
    expect(result).toEqual({ success: true })
  })
})

describe('adminUnbindCustomOAuth', () => {
  test('deletes custom oauth binding', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    const result = await adminUnbindCustomOAuth(5, 'provider-123')
    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/5/oauth/bindings/provider-123')
    expect(result).toEqual({ success: true })
  })
})

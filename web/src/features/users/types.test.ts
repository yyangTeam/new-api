import { userSchema, userStatusSchema, userRoleSchema } from './types'

const validUser = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  quota: 100000,
  used_quota: 5000,
  request_count: 250,
  group: 'default',
  status: 1,
  role: 1,
}

describe('userStatusSchema', () => {
  test('accepts valid status number 1 (enabled)', () => {
    const result = userStatusSchema.safeParse(1)
    expect(result.success).toBe(true)
  })

  test('accepts valid status number 2 (disabled)', () => {
    const result = userStatusSchema.safeParse(2)
    expect(result.success).toBe(true)
  })

  test('rejects string status', () => {
    const result = userStatusSchema.safeParse('enabled')
    expect(result.success).toBe(false)
  })

  test('rejects boolean status', () => {
    const result = userStatusSchema.safeParse(true)
    expect(result.success).toBe(false)
  })
})

describe('userRoleSchema', () => {
  test('accepts common user role 1', () => {
    const result = userRoleSchema.safeParse(1)
    expect(result.success).toBe(true)
  })

  test('accepts admin role 10', () => {
    const result = userRoleSchema.safeParse(10)
    expect(result.success).toBe(true)
  })

  test('accepts root role 100', () => {
    const result = userRoleSchema.safeParse(100)
    expect(result.success).toBe(true)
  })

  test('rejects string role', () => {
    const result = userRoleSchema.safeParse('admin')
    expect(result.success).toBe(false)
  })
})

describe('userSchema', () => {
  test('parses valid user with required fields', () => {
    const result = userSchema.safeParse(validUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.username).toBe('testuser')
      expect(result.data.display_name).toBe('Test User')
      expect(result.data.quota).toBe(100000)
      expect(result.data.status).toBe(1)
      expect(result.data.role).toBe(1)
    }
  })

  test('parses user with all optional fields', () => {
    const fullUser = {
      ...validUser,
      password: 'hashed_password',
      github_id: 'gh-12345',
      oidc_id: 'oidc-123',
      wechat_id: 'wc-123',
      telegram_id: 'tg-123',
      email: 'test@example.com',
      aff_code: 'AFF001',
      aff_count: 10,
      aff_quota: 500,
      aff_history_quota: 1000,
      inviter_id: 42,
      linux_do_id: 'ld-123',
      created_at: 1700000000,
      updated_at: 1700001000,
      last_login_at: 1700002000,
      DeletedAt: null,
      remark: 'VIP user',
      admin_permissions: {
        channels: { read: true, write: false },
      },
    }
    const result = userSchema.safeParse(fullUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('test@example.com')
      expect(result.data.github_id).toBe('gh-12345')
      expect(result.data.aff_count).toBe(10)
      expect(result.data.remark).toBe('VIP user')
      expect(result.data.admin_permissions).toEqual({
        channels: { read: true, write: false },
      })
    }
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validUser
    const result = userSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required username', () => {
    const { username: _, ...noUsername } = validUser
    const result = userSchema.safeParse(noUsername)
    expect(result.success).toBe(false)
  })

  test('rejects missing required display_name', () => {
    const { display_name: _, ...noDisplayName } = validUser
    const result = userSchema.safeParse(noDisplayName)
    expect(result.success).toBe(false)
  })

  test('rejects missing required group', () => {
    const { group: _, ...noGroup } = validUser
    const result = userSchema.safeParse(noGroup)
    expect(result.success).toBe(false)
  })

  test('rejects missing required status', () => {
    const { status: _, ...noStatus } = validUser
    const result = userSchema.safeParse(noStatus)
    expect(result.success).toBe(false)
  })

  test('rejects missing required role', () => {
    const { role: _, ...noRole } = validUser
    const result = userSchema.safeParse(noRole)
    expect(result.success).toBe(false)
  })

  test('rejects non-number id', () => {
    const result = userSchema.safeParse({ ...validUser, id: 'abc' })
    expect(result.success).toBe(false)
  })

  test('rejects non-number quota', () => {
    const result = userSchema.safeParse({ ...validUser, quota: 'unlimited' })
    expect(result.success).toBe(false)
  })

  test('rejects non-string username', () => {
    const result = userSchema.safeParse({ ...validUser, username: 123 })
    expect(result.success).toBe(false)
  })

  test('accepts DeletedAt as null', () => {
    const result = userSchema.safeParse({ ...validUser, DeletedAt: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.DeletedAt).toBeNull()
    }
  })

  test('accepts admin_permissions as nested record of booleans', () => {
    const result = userSchema.safeParse({
      ...validUser,
      admin_permissions: {
        users: { create: true, delete: false },
        keys: { read: true },
      },
    })
    expect(result.success).toBe(true)
  })
})

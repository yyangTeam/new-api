import type { PermissionCatalog } from '@/lib/admin-permissions'

import type { User } from '../types'

import {
  userFormSchema,
  USER_FORM_DEFAULT_VALUES,
  transformFormDataToPayload,
  transformUserToFormDefaults,
} from './user-form'

vi.mock('@/lib/format', () => ({
  quotaUnitsToDollars: (units: number) => units / 500000,
}))

vi.mock('@/lib/admin-permissions', () => ({
  ROLE: { ADMIN: 10, SUPER_ADMIN: 100 },
  normalizeAdminPermissions: (
    value: Record<string, Record<string, boolean>> | null | undefined,
    _catalog: PermissionCatalog
  ) => value ?? {},
}))

vi.mock('@/lib/roles', () => ({
  ROLE: { ADMIN: 10, SUPER_ADMIN: 100 },
}))

describe('userFormSchema', () => {
  test('accepts valid form data', () => {
    const result = userFormSchema.safeParse({
      username: 'testuser',
      display_name: 'Test User',
      password: 'password123',
      role: 1,
      quota_dollars: 10,
      group: 'default',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty username', () => {
    const result = userFormSchema.safeParse({
      username: '',
    })
    expect(result.success).toBe(false)
  })

  test('accepts minimal data with only username', () => {
    const result = userFormSchema.safeParse({
      username: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  test('rejects negative quota', () => {
    const result = userFormSchema.safeParse({
      username: 'testuser',
      quota_dollars: -5,
    })
    expect(result.success).toBe(false)
  })

  test('accepts zero quota', () => {
    const result = userFormSchema.safeParse({
      username: 'testuser',
      quota_dollars: 0,
    })
    expect(result.success).toBe(true)
  })

  test('accepts admin_permissions as nested record', () => {
    const result = userFormSchema.safeParse({
      username: 'admin',
      admin_permissions: {
        channel: { read: true, write: false },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('USER_FORM_DEFAULT_VALUES', () => {
  test('has expected defaults', () => {
    expect(USER_FORM_DEFAULT_VALUES.username).toBe('')
    expect(USER_FORM_DEFAULT_VALUES.display_name).toBe('')
    expect(USER_FORM_DEFAULT_VALUES.password).toBe('')
    expect(USER_FORM_DEFAULT_VALUES.role).toBe(1)
    expect(USER_FORM_DEFAULT_VALUES.quota_dollars).toBe(0)
    expect(USER_FORM_DEFAULT_VALUES.group).toBe('default')
    expect(USER_FORM_DEFAULT_VALUES.remark).toBe('')
    expect(USER_FORM_DEFAULT_VALUES.admin_permissions).toEqual({})
  })
})

describe('transformFormDataToPayload', () => {
  test('transforms data for user creation (no userId)', () => {
    const payload = transformFormDataToPayload({
      username: 'newuser',
      display_name: 'New User',
      password: 'pass123',
      role: 1,
    })

    expect(payload.username).toBe('newuser')
    expect(payload.display_name).toBe('New User')
    expect(payload.password).toBe('pass123')
    expect(payload.role).toBe(1)
    expect(payload.id).toBeUndefined()
    expect(payload.group).toBeUndefined()
    expect(payload.remark).toBeUndefined()
  })

  test('defaults role to 1 for creation when not specified', () => {
    const payload = transformFormDataToPayload({
      username: 'newuser',
    })
    expect(payload.role).toBe(1)
  })

  test('transforms data for user update (with userId)', () => {
    const payload = transformFormDataToPayload(
      {
        username: 'existing',
        display_name: 'Existing User',
        password: 'newpass',
        role: 10,
        group: 'vip',
        remark: 'Some note',
      },
      42
    )

    expect(payload.username).toBe('existing')
    expect(payload.display_name).toBe('Existing User')
    expect(payload.password).toBe('newpass')
    expect(payload.id).toBe(42)
    expect(payload.group).toBe('vip')
    expect(payload.remark).toBe('Some note')
    expect(payload.role).toBeUndefined()
  })

  test('uses username as display_name when display_name is empty', () => {
    const payload = transformFormDataToPayload({
      username: 'myuser',
      display_name: '',
    })
    expect(payload.display_name).toBe('myuser')
  })

  test('omits password when empty', () => {
    const payload = transformFormDataToPayload({
      username: 'user',
      password: '',
    })
    expect(payload.password).toBeUndefined()
  })

  test('omits remark when empty on update', () => {
    const payload = transformFormDataToPayload(
      {
        username: 'user',
        remark: '',
      },
      1
    )
    expect(payload.remark).toBeUndefined()
  })

  test('includes admin_permissions for admin role with catalog', () => {
    const catalog: PermissionCatalog = {
      resources: [
        {
          resource: 'channel',
          label_key: 'Channel',
          actions: [{ action: 'read', label_key: 'Read', description_key: '' }],
        },
      ],
      roles: [],
    }

    const payload = transformFormDataToPayload(
      {
        username: 'admin',
        role: 10,
        admin_permissions: { channel: { read: true } },
      },
      undefined,
      catalog
    )

    expect(payload.admin_permissions).toEqual({ channel: { read: true } })
  })

  test('omits admin_permissions for non-admin role', () => {
    const catalog: PermissionCatalog = {
      resources: [],
      roles: [],
    }

    const payload = transformFormDataToPayload(
      {
        username: 'user',
        role: 1,
        admin_permissions: { channel: { read: true } },
      },
      undefined,
      catalog
    )

    expect(payload.admin_permissions).toBeUndefined()
  })

  test('omits admin_permissions when catalog is not provided', () => {
    const payload = transformFormDataToPayload({
      username: 'admin',
      role: 10,
      admin_permissions: { channel: { read: true } },
    })

    expect(payload.admin_permissions).toBeUndefined()
  })

  test('preserves role value 0 on update (does not default)', () => {
    const payload = transformFormDataToPayload(
      {
        username: 'user',
        role: 0,
      },
      5
    )
    expect(payload.role).toBeUndefined()
  })
})

describe('transformUserToFormDefaults', () => {
  const baseUser: User = {
    id: 1,
    username: 'testuser',
    display_name: 'Test User',
    quota: 5000000,
    used_quota: 1000000,
    request_count: 42,
    group: 'vip',
    status: 1,
    role: 1,
    remark: 'A note',
    admin_permissions: { channel: { read: true } },
  }

  test('transforms basic user fields', () => {
    const form = transformUserToFormDefaults(baseUser)
    expect(form.username).toBe('testuser')
    expect(form.display_name).toBe('Test User')
    expect(form.password).toBe('')
    expect(form.role).toBe(1)
    expect(form.remark).toBe('A note')
  })

  test('converts quota units to dollars', () => {
    const form = transformUserToFormDefaults(baseUser)
    expect(form.quota_dollars).toBe(10)
  })

  test('defaults group to DEFAULT_GROUP when empty', () => {
    const form = transformUserToFormDefaults({
      ...baseUser,
      group: '',
    })
    expect(form.group).toBe('default')
  })

  test('preserves existing group', () => {
    const form = transformUserToFormDefaults(baseUser)
    expect(form.group).toBe('vip')
  })

  test('defaults remark to empty string when falsy', () => {
    const form = transformUserToFormDefaults({
      ...baseUser,
      remark: undefined,
    })
    expect(form.remark).toBe('')
  })

  test('passes through admin_permissions', () => {
    const form = transformUserToFormDefaults(baseUser)
    expect(form.admin_permissions).toEqual({ channel: { read: true } })
  })

  test('defaults admin_permissions to empty object when undefined', () => {
    const form = transformUserToFormDefaults({
      ...baseUser,
      admin_permissions: undefined,
    })
    expect(form.admin_permissions).toEqual({})
  })
})

import type { AuthUser } from '@/stores/auth-store'

import {
  hasPermission,
  roleGrants,
  normalizeAdminPermissions,
  ADMIN_ROLE_KEY,
  EMPTY_PERMISSION_CATALOG,
  type PermissionCatalog,
} from './admin-permissions'
import { ROLE } from './roles'

const catalog: PermissionCatalog = {
  resources: [
    {
      resource: 'channel',
      label_key: 'Channel',
      actions: [
        { action: 'read', label_key: 'Read', description_key: '' },
        { action: 'write', label_key: 'Write', description_key: '' },
        { action: 'operate', label_key: 'Operate', description_key: '' },
      ],
    },
    {
      resource: 'user',
      label_key: 'User',
      actions: [
        { action: 'read', label_key: 'Read', description_key: '' },
        { action: 'write', label_key: 'Write', description_key: '' },
      ],
    },
  ],
  roles: [
    {
      key: 'admin',
      name: 'Admin',
      built_in: true,
      superuser: false,
      grants: {
        channel: { read: true, write: false, operate: true },
        user: { read: true, write: false },
      },
    },
    {
      key: 'viewer',
      name: 'Viewer',
      built_in: true,
      superuser: false,
      grants: {
        channel: { read: true, write: false, operate: false },
      },
    },
  ],
}

describe('hasPermission', () => {
  test('returns false for null user', () => {
    expect(hasPermission(null, 'channel', 'read')).toBe(false)
  })

  test('returns false for undefined user', () => {
    expect(hasPermission(undefined, 'channel', 'read')).toBe(false)
  })

  test('returns true for super admin regardless of permissions', () => {
    const user: AuthUser = {
      id: 1,
      username: 'root',
      role: ROLE.SUPER_ADMIN,
    }
    expect(hasPermission(user, 'channel', 'read')).toBe(true)
    expect(hasPermission(user, 'nonexistent', 'anything')).toBe(true)
  })

  test('returns true when admin_permissions grants the action', () => {
    const user: AuthUser = {
      id: 2,
      username: 'admin',
      role: ROLE.ADMIN,
      permissions: {
        admin_permissions: {
          channel: { read: true, write: false },
        },
      },
    }
    expect(hasPermission(user, 'channel', 'read')).toBe(true)
  })

  test('returns false when admin_permissions denies the action', () => {
    const user: AuthUser = {
      id: 2,
      username: 'admin',
      role: ROLE.ADMIN,
      permissions: {
        admin_permissions: {
          channel: { read: true, write: false },
        },
      },
    }
    expect(hasPermission(user, 'channel', 'write')).toBe(false)
  })

  test('returns false when resource is missing from permissions', () => {
    const user: AuthUser = {
      id: 2,
      username: 'admin',
      role: ROLE.ADMIN,
      permissions: {
        admin_permissions: {
          channel: { read: true },
        },
      },
    }
    expect(hasPermission(user, 'user', 'read')).toBe(false)
  })

  test('returns false when permissions object is undefined', () => {
    const user: AuthUser = {
      id: 2,
      username: 'admin',
      role: ROLE.ADMIN,
    }
    expect(hasPermission(user, 'channel', 'read')).toBe(false)
  })

  test('returns false for regular user without permissions', () => {
    const user: AuthUser = {
      id: 3,
      username: 'user',
      role: ROLE.USER,
    }
    expect(hasPermission(user, 'channel', 'read')).toBe(false)
  })
})

describe('roleGrants', () => {
  test('returns grants for an existing role', () => {
    expect(roleGrants(catalog, 'admin')).toEqual({
      channel: { read: true, write: false, operate: true },
      user: { read: true, write: false },
    })
  })

  test('returns grants for viewer role', () => {
    expect(roleGrants(catalog, 'viewer')).toEqual({
      channel: { read: true, write: false, operate: false },
    })
  })

  test('returns empty object for unknown role', () => {
    expect(roleGrants(catalog, 'nonexistent')).toEqual({})
  })

  test('returns empty object for empty catalog', () => {
    expect(roleGrants(EMPTY_PERMISSION_CATALOG, 'admin')).toEqual({})
  })
})

describe('normalizeAdminPermissions', () => {
  test('fills all values from admin baseline when value is null', () => {
    const result = normalizeAdminPermissions(null, catalog)
    expect(result).toEqual({
      channel: { read: true, write: false, operate: true },
      user: { read: true, write: false },
    })
  })

  test('fills all values from admin baseline when value is undefined', () => {
    const result = normalizeAdminPermissions(undefined, catalog)
    expect(result).toEqual({
      channel: { read: true, write: false, operate: true },
      user: { read: true, write: false },
    })
  })

  test('uses provided values over baseline', () => {
    const value = {
      channel: { read: false, write: true, operate: false },
    }
    const result = normalizeAdminPermissions(value, catalog)
    expect(result).toEqual({
      channel: { read: false, write: true, operate: false },
      user: { read: true, write: false },
    })
  })

  test('partially overrides baseline per action', () => {
    const value = {
      channel: { write: true },
    }
    const result = normalizeAdminPermissions(value, catalog)
    expect(result.channel.read).toBe(true)
    expect(result.channel.write).toBe(true)
    expect(result.channel.operate).toBe(true)
    expect(result.user).toEqual({ read: true, write: false })
  })

  test('returns empty object for empty catalog', () => {
    const result = normalizeAdminPermissions({ channel: { read: true } }, EMPTY_PERMISSION_CATALOG)
    expect(result).toEqual({})
  })

  test('defaults to false when neither value nor baseline has the action', () => {
    const catalogNoGrants: PermissionCatalog = {
      resources: [
        {
          resource: 'billing',
          label_key: 'Billing',
          actions: [
            { action: 'read', label_key: 'Read', description_key: '' },
          ],
        },
      ],
      roles: [
        {
          key: ADMIN_ROLE_KEY,
          name: 'Admin',
          built_in: true,
          superuser: false,
          grants: {},
        },
      ],
    }
    const result = normalizeAdminPermissions(null, catalogNoGrants)
    expect(result.billing.read).toBe(false)
  })
})

import { isUserDeleted, getUserStatusOptions, getUserRoleOptions } from './constants'
import type { User as UserType } from './types'

const t = ((key: string) => key) as any

describe('isUserDeleted', () => {
  test('returns true when DeletedAt is a non-null value', () => {
    const user = { DeletedAt: '2024-01-01T00:00:00Z' } as unknown as UserType
    expect(isUserDeleted(user)).toBe(true)
  })

  test('returns false when DeletedAt is null', () => {
    const user = { DeletedAt: null } as unknown as UserType
    expect(isUserDeleted(user)).toBe(false)
  })

  test('returns false when DeletedAt is undefined', () => {
    const user = {} as unknown as UserType
    expect(isUserDeleted(user)).toBe(false)
  })
})

describe('getUserStatusOptions', () => {
  test('returns 3 status options', () => {
    const options = getUserStatusOptions(t)
    expect(options).toHaveLength(3)
  })

  test('includes Enabled with value "1"', () => {
    const options = getUserStatusOptions(t)
    const enabled = options.find((o) => o.value === '1')
    expect(enabled).toBeDefined()
    expect(enabled!.label).toBe('Enabled')
  })

  test('includes Disabled with value "2"', () => {
    const options = getUserStatusOptions(t)
    const disabled = options.find((o) => o.value === '2')
    expect(disabled).toBeDefined()
    expect(disabled!.label).toBe('Disabled')
  })

  test('includes Deleted with value "-1"', () => {
    const options = getUserStatusOptions(t)
    const deleted = options.find((o) => o.value === '-1')
    expect(deleted).toBeDefined()
    expect(deleted!.label).toBe('Deleted')
  })

  test('values are string representations of status constants', () => {
    const options = getUserStatusOptions(t)
    expect(options.map((o) => o.value)).toEqual(['1', '2', '-1'])
  })
})

describe('getUserRoleOptions', () => {
  test('returns 3 role options', () => {
    const options = getUserRoleOptions(t)
    expect(options).toHaveLength(3)
  })

  test('includes User with value "1"', () => {
    const options = getUserRoleOptions(t)
    const user = options.find((o) => o.value === '1')
    expect(user).toBeDefined()
    expect(user!.label).toBe('User')
  })

  test('includes Admin with value "10"', () => {
    const options = getUserRoleOptions(t)
    const admin = options.find((o) => o.value === '10')
    expect(admin).toBeDefined()
    expect(admin!.label).toBe('Admin')
  })

  test('includes Root with value "100"', () => {
    const options = getUserRoleOptions(t)
    const root = options.find((o) => o.value === '100')
    expect(root).toBeDefined()
    expect(root!.label).toBe('Root')
  })

  test('each option has an icon', () => {
    const options = getUserRoleOptions(t)
    options.forEach((o) => {
      expect(o.icon).toBeDefined()
    })
  })
})

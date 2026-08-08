import { getRoleLabelKey, ROLE } from './roles'

vi.mock('i18next', () => ({
  t: (key: string) => key,
}))

describe('ROLE constants', () => {
  test('has expected numeric values', () => {
    expect(ROLE.GUEST).toBe(0)
    expect(ROLE.USER).toBe(1)
    expect(ROLE.ADMIN).toBe(10)
    expect(ROLE.SUPER_ADMIN).toBe(100)
  })
})

describe('getRoleLabelKey', () => {
  test('returns correct label key for each known role', () => {
    expect(getRoleLabelKey(ROLE.SUPER_ADMIN)).toBe('Super Admin')
    expect(getRoleLabelKey(ROLE.ADMIN)).toBe('Admin')
    expect(getRoleLabelKey(ROLE.USER)).toBe('User')
    expect(getRoleLabelKey(ROLE.GUEST)).toBe('Guest')
  })

  test('returns Guest for undefined', () => {
    expect(getRoleLabelKey(undefined)).toBe('Guest')
  })

  test('returns Guest for unknown numeric role', () => {
    expect(getRoleLabelKey(999)).toBe('Guest')
    expect(getRoleLabelKey(-1)).toBe('Guest')
    expect(getRoleLabelKey(50)).toBe('Guest')
  })
})

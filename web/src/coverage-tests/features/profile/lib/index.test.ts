import * as libIndex from '@/features/profile/lib/index'

describe('profile lib index', () => {
  test('exports parseUserSettings', () => {
    expect(libIndex).toHaveProperty('parseUserSettings')
    expect(typeof libIndex.parseUserSettings).toBe('function')
  })

  test('exports getDisplayName', () => {
    expect(libIndex).toHaveProperty('getDisplayName')
    expect(typeof libIndex.getDisplayName).toBe('function')
  })

  test('exports getUserInitials', () => {
    expect(libIndex).toHaveProperty('getUserInitials')
    expect(typeof libIndex.getUserInitials).toBe('function')
  })
})

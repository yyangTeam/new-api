import * as hooksIndex from '@/features/profile/hooks/index'

describe('profile hooks index', () => {
  test('exports useProfile', () => {
    expect(hooksIndex).toHaveProperty('useProfile')
  })

  test('exports useAccessToken', () => {
    expect(hooksIndex).toHaveProperty('useAccessToken')
  })

  test('exports useTwoFA', () => {
    expect(hooksIndex).toHaveProperty('useTwoFA')
  })
})

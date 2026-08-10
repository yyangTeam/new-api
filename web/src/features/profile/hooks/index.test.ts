import * as hooksIndex from './index'

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

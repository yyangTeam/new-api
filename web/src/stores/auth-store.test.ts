import { useAuthStore, type AuthUser } from './auth-store'

const testUser: AuthUser = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  role: 1,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  test('initializes with null user', () => {
    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  test('setUser persists user to state', () => {
    useAuthStore.getState().auth.setUser(testUser)

    expect(useAuthStore.getState().auth.user).toEqual(testUser)
  })

  test('reset clears user from state', () => {
    useAuthStore.getState().auth.setUser(testUser)
    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  test('setUser with null clears user from state', () => {
    useAuthStore.getState().auth.setUser(testUser)
    useAuthStore.getState().auth.setUser(null)

    expect(useAuthStore.getState().auth.user).toBeNull()
  })
})

import { useAuthStore, type AuthUser } from './auth-store'

const testUser: AuthUser = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  role: 1,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().auth.reset()
  })

  test('initializes with null user when localStorage is empty', () => {
    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  test('setUser persists user to state and localStorage', () => {
    useAuthStore.getState().auth.setUser(testUser)

    expect(useAuthStore.getState().auth.user).toEqual(testUser)
    expect(JSON.parse(localStorage.getItem('user') ?? '')).toEqual(testUser)
  })

  test('reset clears user from state and localStorage', () => {
    useAuthStore.getState().auth.setUser(testUser)
    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  test('setUser with null removes user from localStorage', () => {
    useAuthStore.getState().auth.setUser(testUser)
    useAuthStore.getState().auth.setUser(null)

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})

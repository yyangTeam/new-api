import {
  useAuthStore,
  type AuthUser,
  type AuthBundle,
  type LoginSession,
} from './auth-store'

const testUser: AuthUser = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  role: 1,
}

const testSession: LoginSession = {
  sid: 'sess_123',
  current: true,
  login_method: 'password',
  ip: '127.0.0.1',
  user_agent: 'test-browser',
  created_at: 1700000000,
  last_active_at: 1700000100,
  expires_at: 1700100000,
}

const testBundle: AuthBundle = {
  access_token: 'token_abc',
  token_type: 'Bearer',
  access_expires_at: 1700100000,
  user: testUser,
  session: testSession,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  describe('initial state', () => {
    test('user is null', () => {
      expect(useAuthStore.getState().auth.user).toBeNull()
    })

    test('accessToken is null', () => {
      expect(useAuthStore.getState().auth.accessToken).toBeNull()
    })

    test('accessExpiresAt is null', () => {
      expect(useAuthStore.getState().auth.accessExpiresAt).toBeNull()
    })

    test('session is null', () => {
      expect(useAuthStore.getState().auth.session).toBeNull()
    })

    test('pending2FAFlowToken is null', () => {
      expect(useAuthStore.getState().auth.pending2FAFlowToken).toBeNull()
    })

    test('bootstrapState is complete after reset', () => {
      expect(useAuthStore.getState().auth.bootstrapState).toBe('complete')
    })
  })

  describe('setBundle', () => {
    test('sets user from bundle', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.user).toEqual(testUser)
    })

    test('sets accessToken from bundle', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.accessToken).toBe('token_abc')
    })

    test('sets accessExpiresAt from bundle', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.accessExpiresAt).toBe(1700100000)
    })

    test('sets session from bundle', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.session).toEqual(testSession)
    })

    test('clears pending2FAFlowToken', () => {
      useAuthStore.getState().auth.setPending2FAFlowToken('flow_xyz')
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.pending2FAFlowToken).toBeNull()
    })

    test('sets bootstrapState to complete', () => {
      useAuthStore.getState().auth.setBootstrapState('checking')
      useAuthStore.getState().auth.setBundle(testBundle)
      expect(useAuthStore.getState().auth.bootstrapState).toBe('complete')
    })
  })

  describe('setUser', () => {
    test('persists user to state', () => {
      useAuthStore.getState().auth.setUser(testUser)
      expect(useAuthStore.getState().auth.user).toEqual(testUser)
    })

    test('sets user to null', () => {
      useAuthStore.getState().auth.setUser(testUser)
      useAuthStore.getState().auth.setUser(null)
      expect(useAuthStore.getState().auth.user).toBeNull()
    })

    test('preserves other state when setting user', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      const newUser: AuthUser = { ...testUser, username: 'updated' }
      useAuthStore.getState().auth.setUser(newUser)
      expect(useAuthStore.getState().auth.accessToken).toBe('token_abc')
      expect(useAuthStore.getState().auth.user?.username).toBe('updated')
    })
  })

  describe('setPending2FAFlowToken', () => {
    test('sets flow token', () => {
      useAuthStore.getState().auth.setPending2FAFlowToken('2fa_token')
      expect(useAuthStore.getState().auth.pending2FAFlowToken).toBe(
        '2fa_token'
      )
    })

    test('clears flow token with null', () => {
      useAuthStore.getState().auth.setPending2FAFlowToken('2fa_token')
      useAuthStore.getState().auth.setPending2FAFlowToken(null)
      expect(useAuthStore.getState().auth.pending2FAFlowToken).toBeNull()
    })
  })

  describe('setBootstrapState', () => {
    test('sets to idle', () => {
      useAuthStore.getState().auth.setBootstrapState('idle')
      expect(useAuthStore.getState().auth.bootstrapState).toBe('idle')
    })

    test('sets to checking', () => {
      useAuthStore.getState().auth.setBootstrapState('checking')
      expect(useAuthStore.getState().auth.bootstrapState).toBe('checking')
    })

    test('sets to complete', () => {
      useAuthStore.getState().auth.setBootstrapState('idle')
      useAuthStore.getState().auth.setBootstrapState('complete')
      expect(useAuthStore.getState().auth.bootstrapState).toBe('complete')
    })
  })

  describe('reset', () => {
    test('clears all auth data', () => {
      useAuthStore.getState().auth.setBundle(testBundle)
      useAuthStore.getState().auth.reset()
      const { auth } = useAuthStore.getState()
      expect(auth.user).toBeNull()
      expect(auth.accessToken).toBeNull()
      expect(auth.accessExpiresAt).toBeNull()
      expect(auth.session).toBeNull()
      expect(auth.pending2FAFlowToken).toBeNull()
    })

    test('defaults bootstrapState to complete', () => {
      useAuthStore.getState().auth.reset()
      expect(useAuthStore.getState().auth.bootstrapState).toBe('complete')
    })

    test('accepts custom bootstrapState', () => {
      useAuthStore.getState().auth.reset('idle')
      expect(useAuthStore.getState().auth.bootstrapState).toBe('idle')
    })

    test('accepts checking as bootstrapState', () => {
      useAuthStore.getState().auth.reset('checking')
      expect(useAuthStore.getState().auth.bootstrapState).toBe('checking')
    })
  })
})

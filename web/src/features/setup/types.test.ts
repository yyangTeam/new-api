import type { SetupUsageMode, SetupStatus, SetupFormValues, SetupResponse } from './types'

describe('setup types', () => {
  test('SetupUsageMode accepts valid values', () => {
    const modes: SetupUsageMode[] = ['external', 'self', 'demo']
    expect(modes).toHaveLength(3)
  })

  test('SetupStatus structure', () => {
    const status: SetupStatus = {
      status: false,
      root_init: false,
      database_type: 'sqlite',
    }
    expect(status.status).toBe(false)
    expect(status.root_init).toBe(false)
    expect(status.database_type).toBe('sqlite')
  })

  test('SetupStatus with optional fields', () => {
    const status: SetupStatus = {
      status: true,
      root_init: true,
      database_type: 'mysql',
      SelfUseModeEnabled: true,
      DemoSiteEnabled: false,
    }
    expect(status.SelfUseModeEnabled).toBe(true)
    expect(status.DemoSiteEnabled).toBe(false)
  })

  test('SetupFormValues structure', () => {
    const form: SetupFormValues = {
      username: 'admin',
      password: 'pass1234',
      confirmPassword: 'pass1234',
      usageMode: 'external',
    }
    expect(form.username).toBe('admin')
  })

  test('SetupResponse with optional fields', () => {
    const response: SetupResponse = {
      success: true,
      message: 'ok',
      data: {
        status: true,
        root_init: true,
        database_type: 'postgres',
      },
    }
    expect(response.success).toBe(true)
    expect(response.data?.database_type).toBe('postgres')
  })

  test('SetupResponse minimal', () => {
    const response: SetupResponse = { success: false }
    expect(response.message).toBeUndefined()
    expect(response.data).toBeUndefined()
  })
})

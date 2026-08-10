import { describe, test, expect } from 'vitest'

import {
  getUserActionMessage,
  userFormSchema,
  USER_FORM_DEFAULT_VALUES,
  transformFormDataToPayload,
  transformUserToFormDefaults,
} from './index'

describe('users/lib/index exports', () => {
  test('exports getUserActionMessage', () => {
    expect(getUserActionMessage).toBeDefined()
    expect(typeof getUserActionMessage).toBe('function')
  })

  test('exports userFormSchema', () => {
    expect(userFormSchema).toBeDefined()
  })

  test('exports USER_FORM_DEFAULT_VALUES', () => {
    expect(USER_FORM_DEFAULT_VALUES).toBeDefined()
    expect(USER_FORM_DEFAULT_VALUES.username).toBe('')
  })

  test('exports transformFormDataToPayload', () => {
    expect(transformFormDataToPayload).toBeDefined()
    expect(typeof transformFormDataToPayload).toBe('function')
  })

  test('exports transformUserToFormDefaults', () => {
    expect(transformUserToFormDefaults).toBeDefined()
    expect(typeof transformUserToFormDefaults).toBe('function')
  })
})

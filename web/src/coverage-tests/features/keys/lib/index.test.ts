import { describe, test, expect } from 'vitest'

import {
  getApiKeyFormSchema,
  API_KEY_FORM_DEFAULT_VALUES,
  getApiKeyFormDefaultValues,
  transformFormDataToPayload,
  transformApiKeyToFormDefaults,
} from '@/features/keys/lib/index'

describe('keys/lib/index exports', () => {
  test('exports getApiKeyFormSchema', () => {
    expect(getApiKeyFormSchema).toBeDefined()
    expect(typeof getApiKeyFormSchema).toBe('function')
  })

  test('exports API_KEY_FORM_DEFAULT_VALUES', () => {
    expect(API_KEY_FORM_DEFAULT_VALUES).toBeDefined()
    expect(API_KEY_FORM_DEFAULT_VALUES.name).toBe('')
  })

  test('exports getApiKeyFormDefaultValues', () => {
    expect(getApiKeyFormDefaultValues).toBeDefined()
    expect(typeof getApiKeyFormDefaultValues).toBe('function')
  })

  test('exports transformFormDataToPayload', () => {
    expect(transformFormDataToPayload).toBeDefined()
    expect(typeof transformFormDataToPayload).toBe('function')
  })

  test('exports transformApiKeyToFormDefaults', () => {
    expect(transformApiKeyToFormDefaults).toBeDefined()
    expect(typeof transformApiKeyToFormDefaults).toBe('function')
  })
})

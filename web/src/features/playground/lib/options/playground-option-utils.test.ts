import {
  getModelFallback,
  shouldClearModelForGroup,
  getGroupFallback,
  getOptionLoadErrorMessage,
} from './playground-option-utils'

describe('getModelFallback', () => {
  const models = [
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
  ]

  test('returns null when current model exists in list', () => {
    expect(getModelFallback(models, 'gpt-4')).toBe(null)
  })

  test('returns null when models list is empty', () => {
    expect(getModelFallback([], 'gpt-4')).toBe(null)
  })

  test('returns first model when current model not in list', () => {
    expect(getModelFallback(models, 'claude-3')).toBe('gpt-4')
  })
})

describe('shouldClearModelForGroup', () => {
  const models = [
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
  ]

  test('returns false when currentModel is empty string', () => {
    expect(shouldClearModelForGroup(models, '')).toBe(false)
  })

  test('returns false when current model exists in models', () => {
    expect(shouldClearModelForGroup(models, 'gpt-4')).toBe(false)
  })

  test('returns true when current model not in models', () => {
    expect(shouldClearModelForGroup(models, 'claude-3')).toBe(true)
  })
})

describe('getGroupFallback', () => {
  const groups = [
    { label: 'VIP', value: 'vip', ratio: 1.5 },
    { label: 'Default', value: 'default', ratio: 1 },
    { label: 'Free', value: 'free', ratio: 0.5 },
  ]

  test('returns null when current group exists in list', () => {
    expect(getGroupFallback(groups, 'vip')).toBe(null)
  })

  test('returns null when groups list is empty', () => {
    expect(getGroupFallback([], 'any')).toBe(null)
  })

  test('returns default group when current not found and default exists', () => {
    expect(getGroupFallback(groups, 'missing')).toBe('default')
  })

  test('returns first group when current not found and no default group', () => {
    const noDefault = [
      { label: 'VIP', value: 'vip', ratio: 1.5 },
      { label: 'Pro', value: 'pro', ratio: 2 },
    ]
    expect(getGroupFallback(noDefault, 'missing')).toBe('vip')
  })
})

describe('getOptionLoadErrorMessage', () => {
  test('returns error message when error is an Error instance', () => {
    const error = new Error('Something went wrong')
    expect(getOptionLoadErrorMessage(error, 'fallback')).toBe(
      'Something went wrong'
    )
  })

  test('returns fallback when error is not an Error instance', () => {
    expect(getOptionLoadErrorMessage('string error', 'fallback')).toBe(
      'fallback'
    )
  })

  test('returns fallback for null error', () => {
    expect(getOptionLoadErrorMessage(null, 'default msg')).toBe('default msg')
  })

  test('returns fallback for undefined error', () => {
    expect(getOptionLoadErrorMessage(undefined, 'default msg')).toBe(
      'default msg'
    )
  })
})

import {
  getSubmittableInputText,
  getInputControlState,
} from './input-control-utils'

describe('getSubmittableInputText', () => {
  test('returns null when disabled', () => {
    expect(getSubmittableInputText({ text: 'hello' }, true)).toBe(null)
  })

  test('returns null when text is null', () => {
    expect(getSubmittableInputText({ text: null })).toBe(null)
  })

  test('returns null when text is undefined', () => {
    expect(getSubmittableInputText({})).toBe(null)
  })

  test('returns null when text is whitespace only', () => {
    expect(getSubmittableInputText({ text: '   ' })).toBe(null)
  })

  test('returns text when valid and not disabled', () => {
    expect(getSubmittableInputText({ text: 'hello world' })).toBe(
      'hello world'
    )
  })

  test('returns text with whitespace preserved', () => {
    expect(getSubmittableInputText({ text: '  hello  ' })).toBe('  hello  ')
  })
})

describe('getInputControlState', () => {
  const baseOptions = {
    disabled: false,
    groups: [{ label: 'Default', value: 'default', ratio: 1 }],
    hasStopHandler: false,
    isGenerating: false,
    isModelLoading: false,
    models: [{ label: 'GPT-4', value: 'gpt-4' }],
    text: 'hello',
  }

  test('canSubmit is true when not disabled, has models, and has text', () => {
    const result = getInputControlState(baseOptions)
    expect(result.canSubmit).toBe(true)
  })

  test('canSubmit is false when disabled', () => {
    const result = getInputControlState({ ...baseOptions, disabled: true })
    expect(result.canSubmit).toBe(false)
  })

  test('canSubmit is false when no models', () => {
    const result = getInputControlState({ ...baseOptions, models: [] })
    expect(result.canSubmit).toBe(false)
  })

  test('canSubmit is false when text is empty', () => {
    const result = getInputControlState({ ...baseOptions, text: '' })
    expect(result.canSubmit).toBe(false)
  })

  test('canSubmit is false when text is whitespace only', () => {
    const result = getInputControlState({ ...baseOptions, text: '   ' })
    expect(result.canSubmit).toBe(false)
  })

  test('isSelectorDisabled when disabled', () => {
    const result = getInputControlState({ ...baseOptions, disabled: true })
    expect(result.isSelectorDisabled).toBe(true)
  })

  test('isSelectorDisabled when model loading', () => {
    const result = getInputControlState({
      ...baseOptions,
      isModelLoading: true,
    })
    expect(result.isSelectorDisabled).toBe(true)
  })

  test('isSelectorDisabled when no groups', () => {
    const result = getInputControlState({ ...baseOptions, groups: [] })
    expect(result.isSelectorDisabled).toBe(true)
  })

  test('isSelectorDisabled is false when all conditions met', () => {
    const result = getInputControlState(baseOptions)
    expect(result.isSelectorDisabled).toBe(false)
  })

  test('shouldShowStop is true when generating and has stop handler', () => {
    const result = getInputControlState({
      ...baseOptions,
      isGenerating: true,
      hasStopHandler: true,
    })
    expect(result.shouldShowStop).toBe(true)
  })

  test('shouldShowStop is false when not generating', () => {
    const result = getInputControlState({
      ...baseOptions,
      isGenerating: false,
      hasStopHandler: true,
    })
    expect(result.shouldShowStop).toBe(false)
  })

  test('shouldShowStop is false when no stop handler', () => {
    const result = getInputControlState({
      ...baseOptions,
      isGenerating: true,
      hasStopHandler: false,
    })
    expect(result.shouldShowStop).toBe(false)
  })
})

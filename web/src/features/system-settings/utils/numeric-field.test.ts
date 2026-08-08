import { safeNumberFieldProps } from './numeric-field'
import type { ChangeEvent } from 'react'

function makeField(overrides: Record<string, unknown> = {}) {
  return {
    value: 0,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name: 'test-field',
    ref: vi.fn(),
    ...overrides,
  } as any
}

describe('safeNumberFieldProps', () => {
  describe('value display', () => {
    test('returns the number when value is a finite number', () => {
      const props = safeNumberFieldProps(makeField({ value: 42 }))
      expect(props.value).toBe(42)
    })

    test('returns 0 when value is 0', () => {
      const props = safeNumberFieldProps(makeField({ value: 0 }))
      expect(props.value).toBe(0)
    })

    test('returns negative numbers', () => {
      const props = safeNumberFieldProps(makeField({ value: -5 }))
      expect(props.value).toBe(-5)
    })

    test('returns empty string when value is NaN', () => {
      const props = safeNumberFieldProps(makeField({ value: NaN }))
      expect(props.value).toBe('')
    })

    test('returns empty string when value is Infinity', () => {
      const props = safeNumberFieldProps(makeField({ value: Infinity }))
      expect(props.value).toBe('')
    })

    test('returns empty string when value is -Infinity', () => {
      const props = safeNumberFieldProps(makeField({ value: -Infinity }))
      expect(props.value).toBe('')
    })

    test('returns empty string when value is null', () => {
      const props = safeNumberFieldProps(makeField({ value: null }))
      expect(props.value).toBe('')
    })

    test('returns empty string when value is undefined', () => {
      const props = safeNumberFieldProps(makeField({ value: undefined }))
      expect(props.value).toBe('')
    })

    test('returns empty string when value is a string', () => {
      const props = safeNumberFieldProps(makeField({ value: 'abc' }))
      expect(props.value).toBe('')
    })
  })

  describe('onChange', () => {
    test('calls field.onChange with the number when valueAsNumber is finite', () => {
      const field = makeField()
      const props = safeNumberFieldProps(field)
      const event = { target: { valueAsNumber: 123 } } as ChangeEvent<HTMLInputElement>
      props.onChange(event)
      expect(field.onChange).toHaveBeenCalledWith(123)
    })

    test('calls field.onChange with 0', () => {
      const field = makeField()
      const props = safeNumberFieldProps(field)
      const event = { target: { valueAsNumber: 0 } } as ChangeEvent<HTMLInputElement>
      props.onChange(event)
      expect(field.onChange).toHaveBeenCalledWith(0)
    })

    test('does not call field.onChange when valueAsNumber is NaN', () => {
      const field = makeField()
      const props = safeNumberFieldProps(field)
      const event = { target: { valueAsNumber: NaN } } as ChangeEvent<HTMLInputElement>
      props.onChange(event)
      expect(field.onChange).not.toHaveBeenCalled()
    })

    test('does not call field.onChange when valueAsNumber is Infinity', () => {
      const field = makeField()
      const props = safeNumberFieldProps(field)
      const event = { target: { valueAsNumber: Infinity } } as ChangeEvent<HTMLInputElement>
      props.onChange(event)
      expect(field.onChange).not.toHaveBeenCalled()
    })
  })

  describe('passthrough properties', () => {
    test('passes through onBlur', () => {
      const onBlur = vi.fn()
      const props = safeNumberFieldProps(makeField({ onBlur }))
      props.onBlur()
      expect(onBlur).toHaveBeenCalled()
    })

    test('passes through name', () => {
      const props = safeNumberFieldProps(makeField({ name: 'my-field' }))
      expect(props.name).toBe('my-field')
    })

    test('passes through ref', () => {
      const ref = vi.fn()
      const props = safeNumberFieldProps(makeField({ ref }))
      expect(props.ref).toBe(ref)
    })
  })
})

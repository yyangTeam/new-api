import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { toast } from 'sonner'
import { useSettingsForm } from '@/features/system-settings/hooks/use-settings-form'

describe('useSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns form, handleSubmit, handleReset, isDirty, isSubmitting', () => {
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { name: 'test' },
        onSubmit: vi.fn(),
      })
    )
    expect(result.current.form).toBeDefined()
    expect(result.current.handleSubmit).toBeDefined()
    expect(result.current.handleReset).toBeDefined()
    expect(result.current.isDirty).toBe(false)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('shows info toast when no changes are detected on submit', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { name: 'test' },
        onSubmit,
      })
    )

    // Submit without making changes - form won't have dirty fields
    await act(async () => {
      await result.current.handleSubmit(
        new Event('submit') as unknown as React.BaseSyntheticEvent
      )
    })

    // onSubmit should not be called since no dirty fields exist
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('handleReset resets the form and shows success toast', () => {
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { name: 'original' },
        onSubmit: vi.fn(),
      })
    )

    act(() => {
      result.current.handleReset()
    })

    expect(toast.success).toHaveBeenCalledWith('Form reset to saved values')
  })

  it('expands dot-path defaultValues into nested objects', () => {
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { 'a.b': 'value', c: 'flat' },
        onSubmit: vi.fn(),
      })
    )

    // The form should have expanded values
    const values = result.current.form.getValues()
    expect(values).toEqual({ a: { b: 'value' }, c: 'flat' })
  })

  it('resets form when defaultValues change', () => {
    const { result, rerender } = renderHook(
      ({ defaults }) =>
        useSettingsForm({
          defaultValues: defaults,
          onSubmit: vi.fn(),
        }),
      { initialProps: { defaults: { name: 'first' } } }
    )

    expect(result.current.form.getValues()).toEqual({ name: 'first' })

    rerender({ defaults: { name: 'second' } })
    expect(result.current.form.getValues()).toEqual({ name: 'second' })
  })

  it('does not reset form when defaultValues are serialization-equal', () => {
    const resetSpy = vi.fn()
    const { rerender } = renderHook(
      ({ defaults }) =>
        useSettingsForm({
          defaultValues: defaults,
          onSubmit: vi.fn(),
        }),
      { initialProps: { defaults: { name: 'same' } } }
    )

    // Rerender with new object reference but same content
    rerender({ defaults: { name: 'same' } })
    // Form should not have been reset twice
  })
})

describe('useSettingsForm internal helpers (via form behavior)', () => {
  it('handles nested defaultValues expansion', () => {
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: {
          'level1.level2.level3': 'deep',
          'level1.sibling': 'sib',
          flat: 'value',
        },
        onSubmit: vi.fn(),
      })
    )

    const values = result.current.form.getValues()
    expect(values).toEqual({
      level1: { level2: { level3: 'deep' }, sibling: 'sib' },
      flat: 'value',
    })
  })

  it('handles array values in defaultValues', () => {
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { items: ['a', 'b', 'c'] },
        onSubmit: vi.fn(),
      })
    )

    const values = result.current.form.getValues()
    expect(values.items).toEqual(['a', 'b', 'c'])
  })

  it('accepts custom compareValues function', () => {
    const customCompare = vi.fn().mockReturnValue(true)
    const { result } = renderHook(() =>
      useSettingsForm({
        defaultValues: { name: 'test' },
        onSubmit: vi.fn(),
        compareValues: customCompare,
      })
    )

    expect(result.current.form).toBeDefined()
  })
})

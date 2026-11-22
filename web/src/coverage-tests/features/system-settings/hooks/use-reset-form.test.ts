import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useResetForm } from '@/features/system-settings/hooks/use-reset-form'

function createMockForm() {
  return {
    reset: vi.fn(),
    // Minimal form shape for the hook
  } as unknown as import('react-hook-form').UseFormReturn<{ name: string; age: number }>
}

describe('useResetForm', () => {
  it('does not reset when values is undefined', () => {
    const form = createMockForm()
    renderHook(() => useResetForm(form, undefined))
    expect(form.reset).not.toHaveBeenCalled()
  })

  it('resets form on first render with defined values', () => {
    const form = createMockForm()
    const values = { name: 'test', age: 25 }
    renderHook(() => useResetForm(form, values))
    expect(form.reset).toHaveBeenCalledWith(values)
  })

  it('does not reset again when values remain the same object', () => {
    const form = createMockForm()
    const values = { name: 'test', age: 25 }
    const { rerender } = renderHook(
      ({ v }) => useResetForm(form, v),
      { initialProps: { v: values } }
    )
    expect(form.reset).toHaveBeenCalledTimes(1)

    // Rerender with same reference
    rerender({ v: values })
    expect(form.reset).toHaveBeenCalledTimes(1)
  })

  it('does not reset when new object has same serialized content', () => {
    const form = createMockForm()
    const values1 = { name: 'test', age: 25 }
    const values2 = { name: 'test', age: 25 }

    const { rerender } = renderHook(
      ({ v }) => useResetForm(form, v),
      { initialProps: { v: values1 } }
    )
    expect(form.reset).toHaveBeenCalledTimes(1)

    rerender({ v: values2 })
    expect(form.reset).toHaveBeenCalledTimes(1)
  })

  it('resets when values change', () => {
    const form = createMockForm()
    const values1 = { name: 'test', age: 25 }
    const values2 = { name: 'updated', age: 30 }

    const { rerender } = renderHook(
      ({ v }) => useResetForm(form, v),
      { initialProps: { v: values1 } }
    )
    expect(form.reset).toHaveBeenCalledTimes(1)

    rerender({ v: values2 })
    expect(form.reset).toHaveBeenCalledTimes(2)
    expect(form.reset).toHaveBeenLastCalledWith(values2)
  })

  it('handles transition from undefined to defined values', () => {
    const form = createMockForm()

    const { rerender } = renderHook(
      ({ v }) => useResetForm(form, v),
      { initialProps: { v: undefined as { name: string; age: number } | undefined } }
    )
    expect(form.reset).not.toHaveBeenCalled()

    rerender({ v: { name: 'new', age: 1 } })
    expect(form.reset).toHaveBeenCalledWith({ name: 'new', age: 1 })
  })

  it('handles transition from defined to undefined', () => {
    const form = createMockForm()
    const values = { name: 'test', age: 25 }

    const { rerender } = renderHook(
      ({ v }) => useResetForm(form, v),
      { initialProps: { v: values as { name: string; age: number } | undefined } }
    )
    expect(form.reset).toHaveBeenCalledTimes(1)

    rerender({ v: undefined })
    // Should not reset when values become undefined
    expect(form.reset).toHaveBeenCalledTimes(1)
  })
})

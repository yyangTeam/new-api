import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useControllableState } from './use-controllable-state'

describe('useControllableState', () => {
  describe('uncontrolled mode', () => {
    it('uses defaultProp as initial value', () => {
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: 'initial' })
      )
      expect(result.current[0]).toBe('initial')
    })

    it('updates value when setValue is called with a new value', () => {
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: 'initial' })
      )

      act(() => {
        result.current[1]('updated')
      })

      expect(result.current[0]).toBe('updated')
    })

    it('updates value when setValue is called with updater function', () => {
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: 10 })
      )

      act(() => {
        result.current[1]((prev) => (prev ?? 0) + 5)
      })

      expect(result.current[0]).toBe(15)
    })

    it('accepts undefined defaultProp', () => {
      const { result } = renderHook(() =>
        useControllableState<string>({ defaultProp: undefined })
      )
      expect(result.current[0]).toBeUndefined()
    })
  })

  describe('controlled mode', () => {
    it('uses prop value', () => {
      const { result } = renderHook(() =>
        useControllableState({ prop: 'controlled', defaultProp: 'default' })
      )
      expect(result.current[0]).toBe('controlled')
    })

    it('calls onChange when setValue is called with different value', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        useControllableState({
          prop: 'controlled',
          defaultProp: 'default',
          onChange,
        })
      )

      act(() => {
        result.current[1]('new-value')
      })

      expect(onChange).toHaveBeenCalledWith('new-value')
    })

    it('does not call onChange when setValue is called with same value', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        useControllableState({
          prop: 'controlled',
          defaultProp: 'default',
          onChange,
        })
      )

      act(() => {
        result.current[1]('controlled')
      })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('calls onChange with updater function result', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        useControllableState({
          prop: 'hello',
          defaultProp: 'default',
          onChange,
        })
      )

      act(() => {
        result.current[1]((prev) => (prev ?? '') + ' world')
      })

      expect(onChange).toHaveBeenCalledWith('hello world')
    })

    it('does not call onChange when updater returns same value', () => {
      const onChange = vi.fn()
      const { result } = renderHook(() =>
        useControllableState({
          prop: 'hello',
          defaultProp: 'default',
          onChange,
        })
      )

      act(() => {
        result.current[1]((prev) => prev)
      })

      expect(onChange).not.toHaveBeenCalled()
    })

    it('value follows prop changes', () => {
      const { result, rerender } = renderHook(
        ({ prop }) => useControllableState({ prop, defaultProp: 'default' }),
        { initialProps: { prop: 'first' } }
      )

      expect(result.current[0]).toBe('first')

      rerender({ prop: 'second' })
      expect(result.current[0]).toBe('second')
    })
  })

  describe('transition from uncontrolled to controlled', () => {
    it('switches to controlled value when prop is provided', () => {
      const { result, rerender } = renderHook(
        ({ prop }) =>
          useControllableState({ prop, defaultProp: 'default' }),
        { initialProps: { prop: undefined as string | undefined } }
      )

      expect(result.current[0]).toBe('default')

      rerender({ prop: 'now controlled' })
      expect(result.current[0]).toBe('now controlled')
    })
  })

  describe('onChange ref update', () => {
    it('uses latest onChange callback', () => {
      const onChange1 = vi.fn()
      const onChange2 = vi.fn()

      const { result, rerender } = renderHook(
        ({ onChange }) =>
          useControllableState({
            prop: 'value',
            defaultProp: 'default',
            onChange,
          }),
        { initialProps: { onChange: onChange1 } }
      )

      rerender({ onChange: onChange2 })

      act(() => {
        result.current[1]('new-value')
      })

      expect(onChange1).not.toHaveBeenCalled()
      expect(onChange2).toHaveBeenCalledWith('new-value')
    })
  })
})

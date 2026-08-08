import { renderHook, act } from '@testing-library/react'

import { useDialog, useDialogState, useDialogs } from './use-dialog'

describe('useDialog', () => {
  test('initial state defaults to closed', () => {
    const { result } = renderHook(() => useDialog())
    expect(result.current[0]).toBe(false)
  })

  test('initial state respects initialOpen=true', () => {
    const { result } = renderHook(() => useDialog(true))
    expect(result.current[0]).toBe(true)
  })

  test('open sets state to true', () => {
    const { result } = renderHook(() => useDialog())
    act(() => {
      result.current[1].open()
    })
    expect(result.current[0]).toBe(true)
  })

  test('close sets state to false', () => {
    const { result } = renderHook(() => useDialog(true))
    act(() => {
      result.current[1].close()
    })
    expect(result.current[0]).toBe(false)
  })

  test('toggle flips state', () => {
    const { result } = renderHook(() => useDialog())
    act(() => {
      result.current[1].toggle()
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1].toggle()
    })
    expect(result.current[0]).toBe(false)
  })
})

describe('useDialogState', () => {
  test('initial state is null', () => {
    const { result } = renderHook(() => useDialogState())
    expect(result.current[0]).toBe(null)
    expect(result.current[2].isOpen).toBe(false)
  })

  test('initial state respects provided value', () => {
    const { result } = renderHook(() => useDialogState('hello'))
    expect(result.current[0]).toBe('hello')
    expect(result.current[2].isOpen).toBe(true)
  })

  test('setState sets the value and isOpen becomes true', () => {
    const { result } = renderHook(() => useDialogState<string>())
    act(() => {
      result.current[1]('test-value')
    })
    expect(result.current[0]).toBe('test-value')
    expect(result.current[2].isOpen).toBe(true)
  })

  test('reset clears state to null', () => {
    const { result } = renderHook(() => useDialogState('initial'))
    act(() => {
      result.current[2].reset()
    })
    expect(result.current[0]).toBe(null)
    expect(result.current[2].isOpen).toBe(false)
  })

  test('works with object values', () => {
    const { result } = renderHook(() =>
      useDialogState<{ id: number; name: string }>()
    )
    const obj = { id: 1, name: 'John' }
    act(() => {
      result.current[1](obj)
    })
    expect(result.current[0]).toEqual(obj)
    expect(result.current[2].isOpen).toBe(true)
  })
})

describe('useDialogs', () => {
  test('initial state has no open dialogs', () => {
    const { result } = renderHook(() =>
      useDialogs<'create' | 'edit' | 'delete'>()
    )
    expect(result.current.isOpen('create')).toBe(false)
    expect(result.current.isOpen('edit')).toBe(false)
    expect(result.current.hasAnyOpen).toBe(false)
  })

  test('open sets specific dialog open', () => {
    const { result } = renderHook(() =>
      useDialogs<'create' | 'edit'>()
    )
    act(() => {
      result.current.open('create')
    })
    expect(result.current.isOpen('create')).toBe(true)
    expect(result.current.isOpen('edit')).toBe(false)
    expect(result.current.hasAnyOpen).toBe(true)
  })

  test('close sets specific dialog closed', () => {
    const { result } = renderHook(() =>
      useDialogs<'create' | 'edit'>()
    )
    act(() => {
      result.current.open('create')
      result.current.open('edit')
    })
    act(() => {
      result.current.close('create')
    })
    expect(result.current.isOpen('create')).toBe(false)
    expect(result.current.isOpen('edit')).toBe(true)
  })

  test('toggle flips specific dialog state', () => {
    const { result } = renderHook(() =>
      useDialogs<'create' | 'edit'>()
    )
    act(() => {
      result.current.toggle('create')
    })
    expect(result.current.isOpen('create')).toBe(true)

    act(() => {
      result.current.toggle('create')
    })
    expect(result.current.isOpen('create')).toBe(false)
  })

  test('closeAll closes all open dialogs', () => {
    const { result } = renderHook(() =>
      useDialogs<'create' | 'edit' | 'delete'>()
    )
    act(() => {
      result.current.open('create')
      result.current.open('edit')
      result.current.open('delete')
    })
    expect(result.current.hasAnyOpen).toBe(true)

    act(() => {
      result.current.closeAll()
    })
    expect(result.current.isOpen('create')).toBe(false)
    expect(result.current.isOpen('edit')).toBe(false)
    expect(result.current.isOpen('delete')).toBe(false)
    expect(result.current.hasAnyOpen).toBe(false)
  })

  test('closing already-closed dialog is a no-op', () => {
    const { result } = renderHook(() =>
      useDialogs<'a' | 'b'>()
    )
    act(() => {
      result.current.close('a')
    })
    expect(result.current.isOpen('a')).toBe(false)
    expect(result.current.hasAnyOpen).toBe(false)
  })

  test('opening already-open dialog is a no-op', () => {
    const { result } = renderHook(() =>
      useDialogs<'a'>()
    )
    act(() => {
      result.current.open('a')
    })
    act(() => {
      result.current.open('a')
    })
    expect(result.current.isOpen('a')).toBe(true)
  })
})

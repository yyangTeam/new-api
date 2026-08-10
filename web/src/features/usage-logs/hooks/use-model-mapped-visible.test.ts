import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useModelMappedVisible } from './use-model-mapped-visible'

vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: vi.fn(),
}))

vi.mock('@/hooks/use-admin', () => ({
  useIsAdmin: vi.fn(),
}))

import { useSystemConfigStore } from '@/stores/system-config-store'
import { useIsAdmin } from '@/hooks/use-admin'

const mockUseSystemConfigStore = useSystemConfigStore as unknown as ReturnType<typeof vi.fn>
const mockUseIsAdmin = useIsAdmin as ReturnType<typeof vi.fn>

describe('useModelMappedVisible', () => {
  it('returns false when mode is 0', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: { modelMappedDisplayMode: 0 } })
    )
    mockUseIsAdmin.mockReturnValue(false)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(false)
  })

  it('returns false when mode is undefined (defaults to 0)', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: {} })
    )
    mockUseIsAdmin.mockReturnValue(false)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(false)
  })

  it('returns true when mode is 1 and user is admin', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: { modelMappedDisplayMode: 1 } })
    )
    mockUseIsAdmin.mockReturnValue(true)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(true)
  })

  it('returns false when mode is 1 and user is NOT admin', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: { modelMappedDisplayMode: 1 } })
    )
    mockUseIsAdmin.mockReturnValue(false)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(false)
  })

  it('returns true when mode is 2 regardless of admin status', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: { modelMappedDisplayMode: 2 } })
    )
    mockUseIsAdmin.mockReturnValue(false)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(true)
  })

  it('returns true when mode is 2 and user is admin', () => {
    mockUseSystemConfigStore.mockImplementation((selector: Function) =>
      selector({ config: { modelMappedDisplayMode: 2 } })
    )
    mockUseIsAdmin.mockReturnValue(true)
    const { result } = renderHook(() => useModelMappedVisible())
    expect(result.current).toBe(true)
  })
})

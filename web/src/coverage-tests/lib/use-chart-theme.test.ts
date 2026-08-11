import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/context/theme-provider', () => ({
  useTheme: vi.fn(),
}))

vi.mock('@visactor/vchart', () => ({
  ThemeManager: {
    setCurrentTheme: vi.fn(),
  },
}))

import { useTheme } from '@/context/theme-provider'
import { useChartTheme } from '@/lib/use-chart-theme'

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>

describe('useChartTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.mockReturnValue({ resolvedTheme: 'light' })
  })

  it('returns resolvedTheme from useTheme', () => {
    const { result } = renderHook(() => useChartTheme())
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('sets themeReady to true after ThemeManager loads', async () => {
    const { result } = renderHook(() => useChartTheme())
    await waitFor(() => {
      expect(result.current.themeReady).toBe(true)
    })
  })

  it('sets dark theme when resolvedTheme is dark', async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' })
    const { ThemeManager } = await import('@visactor/vchart')
    const { result } = renderHook(() => useChartTheme())
    await waitFor(() => {
      expect(result.current.themeReady).toBe(true)
    })
    expect(ThemeManager.setCurrentTheme).toHaveBeenCalledWith('dark')
  })

  it('sets light theme when resolvedTheme is light', async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'light' })
    const { ThemeManager } = await import('@visactor/vchart')
    const { result } = renderHook(() => useChartTheme())
    await waitFor(() => {
      expect(result.current.themeReady).toBe(true)
    })
    expect(ThemeManager.setCurrentTheme).toHaveBeenCalledWith('light')
  })

  it('defaults non-dark themes to light', async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'system' })
    const { ThemeManager } = await import('@visactor/vchart')
    const { result } = renderHook(() => useChartTheme())
    await waitFor(() => {
      expect(result.current.themeReady).toBe(true)
    })
    expect(ThemeManager.setCurrentTheme).toHaveBeenCalledWith('light')
  })
})

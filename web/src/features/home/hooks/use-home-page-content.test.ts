import { renderHook, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../api', () => ({
  getHomePageContent: vi.fn(),
}))

import { getHomePageContent } from '../api'
import { useHomePageContent } from './use-home-page-content'

describe('useHomePageContent', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => localStorageMock[key] ?? null
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key, value) => { localStorageMock[key] = value }
    )
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key) => { delete localStorageMock[key] }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('initially returns not loaded with empty content', () => {
    vi.mocked(getHomePageContent).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useHomePageContent())
    expect(result.current.isLoaded).toBe(false)
    expect(result.current.content).toBe('')
  })

  test('loads content from API on success', async () => {
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: true,
      data: '# Welcome',
    })

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.content).toBe('# Welcome')
    expect(result.current.isUrl).toBe(false)
  })

  test('sets isUrl true when content is a URL', async () => {
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: true,
      data: 'https://example.com/home',
    })

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.isUrl).toBe(true)
  })

  test('clears content when API returns empty', async () => {
    localStorageMock['home_page_content'] = 'cached content'
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: true,
      data: undefined,
    } as any)

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.content).toBe('')
  })

  test('clears content when success is false', async () => {
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: false,
      data: 'something',
    })

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.content).toBe('')
  })

  test('uses cached content from localStorage immediately', async () => {
    localStorageMock['home_page_content'] = 'cached'
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: true,
      data: 'fresh',
    })

    const { result } = renderHook(() => useHomePageContent())

    // The cached value appears first
    await waitFor(() => {
      expect(result.current.content).toBe('fresh')
    })
  })

  test('shows error toast on API failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getHomePageContent).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(toast.error).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load home page content:',
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })

  test('saves content to localStorage on success', async () => {
    vi.mocked(getHomePageContent).mockResolvedValue({
      success: true,
      data: 'new content',
    })

    const { result } = renderHook(() => useHomePageContent())

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(localStorageMock['home_page_content']).toBe('new content')
  })
})

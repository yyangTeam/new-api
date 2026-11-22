import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { useRankings } from '@/features/rankings/hooks/use-rankings'

vi.mock('@/features/rankings/api', () => ({
  getRankings: vi.fn(),
}))

import { getRankings } from '@/features/rankings/api'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('fetches rankings for given period', async () => {
    const mockData = {
      success: true,
      data: {
        models: [],
        vendors: [],
        top_movers: [],
        top_droppers: [],
        models_history: { points: [], models: [], buckets: 0 },
        vendor_share_history: { points: [], vendors: [], buckets: 0 },
      },
    }
    vi.mocked(getRankings).mockResolvedValue(mockData)

    const { result } = renderHook(() => useRankings('week'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(getRankings).toHaveBeenCalledWith('week')
    expect(result.current.data).toEqual(mockData)
  })

  test('handles error state', async () => {
    vi.mocked(getRankings).mockRejectedValue(new Error('Failed'))

    const { result } = renderHook(() => useRankings('month'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  test('passes today period', async () => {
    vi.mocked(getRankings).mockResolvedValue({ success: true, data: {} as any })

    const { result } = renderHook(() => useRankings('today'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(getRankings).toHaveBeenCalledWith('today')
  })
})

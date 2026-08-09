import { render, screen, waitFor } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearch: () => ({ period: 'week' }),
}))

const mockNavigate = vi.fn()

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: any) => (
    <div data-testid='public-layout'>{children}</div>
  ),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children, ...props }: any) => (
    <div data-testid='page-transition' {...props}>{children}</div>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid='skeleton' className={props.className} />,
}))

vi.mock('./components', () => ({
  MarketShareSection: () => <div data-testid='market-share-section' />,
  ModelsSection: () => <div data-testid='models-section' />,
  PulseSection: () => <div data-testid='pulse-section' />,
  RankingsHero: (props: any) => (
    <div data-testid='rankings-hero' data-period={props.period}>
      <button onClick={() => props.onPeriodChange('month')}>change</button>
    </div>
  ),
}))

vi.mock('./hooks/use-rankings', () => ({
  useRankings: vi.fn(),
}))

import { useRankings } from './hooks/use-rankings'
import { Rankings } from './index'
import { fireEvent } from '@testing-library/react'

describe('Rankings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading skeletons when query is loading', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any)
    render(<Rankings />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1)
  })

  test('renders error state when no snapshot and query errored', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Server crashed'),
    } as any)
    render(<Rankings />)
    expect(screen.getByText('Unable to load rankings')).toBeInTheDocument()
    expect(screen.getByText('Server crashed')).toBeInTheDocument()
  })

  test('renders fallback error message when error is not an Error instance', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: 'something went wrong',
    } as any)
    render(<Rankings />)
    expect(
      screen.getByText('Unable to load rankings data')
    ).toBeInTheDocument()
  })

  test('renders sections when data is available', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          models: [],
          vendors: [],
          top_movers: [],
          top_droppers: [],
          models_history: { points: [], models: [], buckets: 0 },
          vendor_share_history: { points: [], vendors: [], buckets: 0 },
        },
      },
      error: null,
    } as any)
    render(<Rankings />)
    expect(screen.getByTestId('models-section')).toBeInTheDocument()
    expect(screen.getByTestId('market-share-section')).toBeInTheDocument()
    expect(screen.getByTestId('pulse-section')).toBeInTheDocument()
  })

  test('passes period to RankingsHero', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          models: [],
          vendors: [],
          top_movers: [],
          top_droppers: [],
          models_history: { points: [], models: [], buckets: 0 },
          vendor_share_history: { points: [], vendors: [], buckets: 0 },
        },
      },
      error: null,
    } as any)
    render(<Rankings />)
    expect(screen.getByTestId('rankings-hero')).toHaveAttribute(
      'data-period',
      'week'
    )
  })

  test('handlePeriodChange calls navigate', () => {
    vi.mocked(useRankings).mockReturnValue({
      isLoading: false,
      data: {
        data: {
          models: [],
          vendors: [],
          top_movers: [],
          top_droppers: [],
          models_history: { points: [], models: [], buckets: 0 },
          vendor_share_history: { points: [], vendors: [], buckets: 0 },
        },
      },
      error: null,
    } as any)
    render(<Rankings />)
    fireEvent.click(screen.getByText('change'))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/rankings',
      search: expect.any(Function),
    })
  })
})

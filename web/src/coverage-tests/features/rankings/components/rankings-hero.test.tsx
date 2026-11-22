import { render, screen, fireEvent } from '@testing-library/react'

import { RankingsHero } from '@/features/rankings/components/rankings-hero'

describe('RankingsHero', () => {
  const defaultProps = {
    period: 'week' as const,
    onPeriodChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders title', () => {
    render(<RankingsHero {...defaultProps} />)
    expect(screen.getByText('Rankings')).toBeInTheDocument()
  })

  test('renders subtitle description', () => {
    render(<RankingsHero {...defaultProps} />)
    expect(
      screen.getByText(
        'Discover the most-used models and rising vendors on the platform, updated from live usage data.'
      )
    ).toBeInTheDocument()
  })

  test('renders all period tabs', () => {
    render(<RankingsHero {...defaultProps} />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
  })

  test('marks active period tab with aria-selected=true', () => {
    render(<RankingsHero {...defaultProps} period='month' />)
    const monthTab = screen.getByRole('tab', { name: 'Month' })
    expect(monthTab).toHaveAttribute('aria-selected', 'true')
  })

  test('marks non-active period tabs with aria-selected=false', () => {
    render(<RankingsHero {...defaultProps} period='week' />)
    const todayTab = screen.getByRole('tab', { name: 'Today' })
    expect(todayTab).toHaveAttribute('aria-selected', 'false')
  })

  test('calls onPeriodChange when a tab is clicked', () => {
    render(<RankingsHero {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Year' }))
    expect(defaultProps.onPeriodChange).toHaveBeenCalledWith('year')
  })

  test('calls onPeriodChange with today period', () => {
    render(<RankingsHero {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }))
    expect(defaultProps.onPeriodChange).toHaveBeenCalledWith('today')
  })

  test('has tablist role with aria-label', () => {
    render(<RankingsHero {...defaultProps} />)
    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'Period')
  })
})

import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (name: string, size: number) => (
    <span data-testid='lobe-icon' data-name={name} data-size={size} />
  ),
}))

import { PulseSection } from './pulse-section'
import type { RankingMover } from '../types'

const makeMover = (overrides: Partial<RankingMover> = {}): RankingMover => ({
  model_name: 'deepseek-v3',
  vendor: 'DeepSeek',
  vendor_icon: 'DeepSeek',
  rank_delta: 5,
  current_rank: 3,
  growth_pct: 150,
  ...overrides,
})

describe('PulseSection', () => {
  test('renders Trending up and Trending down sections', () => {
    render(<PulseSection movers={[]} droppers={[]} />)
    expect(screen.getByText('Trending up')).toBeInTheDocument()
    expect(screen.getByText('Trending down')).toBeInTheDocument()
  })

  test('renders empty message when no movers', () => {
    render(<PulseSection movers={[]} droppers={[makeMover()]} />)
    expect(
      screen.getByText('No notable climbers right now')
    ).toBeInTheDocument()
  })

  test('renders empty message when no droppers', () => {
    render(<PulseSection movers={[makeMover()]} droppers={[]} />)
    expect(screen.getByText('No notable drops right now')).toBeInTheDocument()
  })

  test('renders mover model names', () => {
    const movers = [
      makeMover({ model_name: 'model-a', rank_delta: 3 }),
      makeMover({ model_name: 'model-b', rank_delta: 2 }),
    ]
    render(<PulseSection movers={movers} droppers={[]} />)
    expect(screen.getByText('model-a')).toBeInTheDocument()
    expect(screen.getByText('model-b')).toBeInTheDocument()
  })

  test('renders dropper model names', () => {
    const droppers = [
      makeMover({ model_name: 'dropper-a', rank_delta: -4 }),
    ]
    render(<PulseSection movers={[]} droppers={droppers} />)
    expect(screen.getByText('dropper-a')).toBeInTheDocument()
  })

  test('shows rank delta for movers', () => {
    const movers = [makeMover({ model_name: 'rising', rank_delta: 7 })]
    render(<PulseSection movers={movers} droppers={[]} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  test('shows absolute rank delta for droppers', () => {
    const droppers = [makeMover({ model_name: 'falling', rank_delta: -3 })]
    render(<PulseSection movers={[]} droppers={droppers} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('shows current rank and vendor', () => {
    const movers = [
      makeMover({ model_name: 'test-model', current_rank: 5, vendor: 'Google' }),
    ]
    render(<PulseSection movers={movers} droppers={[]} />)
    expect(screen.getByText(/google/)).toBeInTheDocument()
  })

  test('renders descriptions for both cards', () => {
    render(<PulseSection movers={[]} droppers={[]} />)
    expect(
      screen.getByText('Models climbing the leaderboard')
    ).toBeInTheDocument()
    expect(screen.getByText('Models losing positions')).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a
      href={to}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (name: string, size: number) => (
    <span data-testid='lobe-icon' data-name={name} data-size={size} />
  ),
}))

import { ModelLeaderboard } from '@/features/rankings/components/model-leaderboard'
import type { ModelRanking } from '@/features/rankings/types'

const makeRow = (overrides: Partial<ModelRanking> = {}): ModelRanking => ({
  rank: 1,
  model_name: 'gpt-4o',
  vendor: 'OpenAI',
  vendor_icon: 'OpenAI',
  category: 'all',
  total_tokens: 1000000,
  share: 0.5,
  growth_pct: 12.5,
  ...overrides,
})

describe('ModelLeaderboard', () => {
  test('returns null when rows is empty', () => {
    const { container } = render(<ModelLeaderboard rows={[]} />)
    expect(container.innerHTML).toBe('')
  })

  test('renders model names from rows', () => {
    const rows = [
      makeRow({ rank: 1, model_name: 'gpt-4o' }),
      makeRow({ rank: 2, model_name: 'claude-3-opus' }),
    ]
    render(<ModelLeaderboard rows={rows} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('claude-3-opus')).toBeInTheDocument()
  })

  test('splits rows into two columns', () => {
    const rows = [
      makeRow({ rank: 1, model_name: 'model-1' }),
      makeRow({ rank: 2, model_name: 'model-2' }),
      makeRow({ rank: 3, model_name: 'model-3' }),
      makeRow({ rank: 4, model_name: 'model-4' }),
    ]
    const { container } = render(<ModelLeaderboard rows={rows} />)
    const lists = container.querySelectorAll('ul')
    expect(lists.length).toBe(2)
  })

  test('single row does not create second column', () => {
    const rows = [makeRow({ rank: 1, model_name: 'solo-model' })]
    const { container } = render(<ModelLeaderboard rows={rows} />)
    const lists = container.querySelectorAll('ul')
    expect(lists.length).toBe(1)
  })

  test('respects limit prop', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ rank: i + 1, model_name: `model-${i}` })
    )
    render(<ModelLeaderboard rows={rows} limit={3} />)
    expect(screen.getByText('model-0')).toBeInTheDocument()
    expect(screen.getByText('model-1')).toBeInTheDocument()
    expect(screen.getByText('model-2')).toBeInTheDocument()
    expect(screen.queryByText('model-3')).not.toBeInTheDocument()
  })

  test('compact variant renders with smaller styling', () => {
    const rows = [makeRow()]
    const { container } = render(
      <ModelLeaderboard rows={rows} variant='compact' />
    )
    const listItems = container.querySelectorAll('li')
    expect(listItems[0].className).toContain('py-2')
  })

  test('default variant renders with larger padding', () => {
    const rows = [makeRow()]
    const { container } = render(<ModelLeaderboard rows={rows} />)
    const listItems = container.querySelectorAll('li')
    expect(listItems[0].className).toContain('py-2.5')
  })

  test('renders vendor name in lowercase', () => {
    const rows = [makeRow({ vendor: 'OpenAI' })]
    render(<ModelLeaderboard rows={rows} />)
    expect(screen.getByText('openai')).toBeInTheDocument()
  })

  test('renders token count for each row', () => {
    const rows = [makeRow({ total_tokens: 1500000 })]
    render(<ModelLeaderboard rows={rows} />)
    expect(screen.getByText('1.50M')).toBeInTheDocument()
  })

  test('does not show tokens label in compact mode', () => {
    const rows = [makeRow({ total_tokens: 1500000 })]
    render(<ModelLeaderboard rows={rows} variant='compact' />)
    expect(screen.queryByText('tokens')).not.toBeInTheDocument()
  })

  test('shows tokens label in default mode', () => {
    const rows = [makeRow({ total_tokens: 1500000 })]
    render(<ModelLeaderboard rows={rows} variant='default' />)
    expect(screen.getByText('tokens')).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'

import { BadgeListCell } from './badge-list-cell'

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copiedText: null,
    copyToClipboard: vi.fn(),
  }),
}))

vi.mock('@/lib/colors', () => ({
  stringToColor: () => 'info',
}))

describe('BadgeListCell', () => {
  test('renders dash when items is empty', () => {
    render(<BadgeListCell items={[]} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('renders items', () => {
    render(
      <BadgeListCell items={[<span key='a'>Item A</span>, <span key='b'>Item B</span>]} />
    )
    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(screen.getByText('Item B')).toBeInTheDocument()
  })

  test('respects max prop', () => {
    render(
      <BadgeListCell
        items={[
          <span key='1'>One</span>,
          <span key='2'>Two</span>,
          <span key='3'>Three</span>,
        ]}
        max={2}
      />
    )
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'

import { Search } from './search'

vi.mock('@/context/search-provider', () => ({
  useSearch: () => ({ open: false, setOpen: vi.fn() }),
}))

describe('Search', () => {
  test('renders with default placeholder', () => {
    render(<Search />)
    expect(
      screen.getByRole('button', { name: 'Search' })
    ).toBeInTheDocument()
  })

  test('renders with custom placeholder', () => {
    render(<Search placeholder='Find models...' />)
    expect(
      screen.getByRole('button', { name: 'Find models...' })
    ).toBeInTheDocument()
    expect(screen.getByText('Find models...')).toBeInTheDocument()
  })

  test('renders keyboard shortcut hint', () => {
    render(<Search />)
    expect(screen.getByText('K')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Search className='w-80' />)
    expect(container.querySelector('.w-80')).toBeInTheDocument()
  })

  test('calls setOpen on click', async () => {
    const setOpen = vi.fn()
    vi.mocked(await import('@/context/search-provider')).useSearch = () => ({
      open: false,
      setOpen,
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<Search />)
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(setOpen).toHaveBeenCalledWith(true)
  })
})

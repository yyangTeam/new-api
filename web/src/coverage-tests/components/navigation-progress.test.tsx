import { render } from '@/test/test-utils'

import { NavigationProgress } from '@/components/navigation-progress'

vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({ status: 'idle' }),
}))

vi.mock('react-top-loading-bar', () => ({
  default: vi.fn().mockImplementation(({ ref, ...props }) => (
    <div data-testid='loading-bar' data-color={props.color} />
  )),
}))

describe('NavigationProgress', () => {
  test('renders the loading bar component', () => {
    const { container } = render(<NavigationProgress />)
    expect(container.querySelector('[data-testid="loading-bar"]')).toBeInTheDocument()
  })

  test('passes color prop to loading bar', () => {
    const { container } = render(<NavigationProgress />)
    const bar = container.querySelector('[data-testid="loading-bar"]')
    expect(bar).toHaveAttribute('data-color', 'var(--muted-foreground)')
  })
})

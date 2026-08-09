import { render, screen } from '@/test/test-utils'

import { ContentSkeleton, QuerySkeleton } from './auto-skeleton'

vi.mock('auto-skeleton-react', () => ({
  AutoSkeleton: (props: { loading: boolean; children: React.ReactNode; config?: any }) => (
    <div data-testid='auto-skeleton' data-loading={props.loading}>
      {props.children}
    </div>
  ),
}))

vi.mock('@/lib/theme-radius', () => ({
  useThemeRadiusPx: () => 8,
}))

describe('ContentSkeleton', () => {
  test('renders children', () => {
    render(
      <ContentSkeleton loading={false}>
        <p>Content</p>
      </ContentSkeleton>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  test('passes loading true to AutoSkeleton', () => {
    render(
      <ContentSkeleton loading>
        <p>Loading content</p>
      </ContentSkeleton>
    )
    expect(screen.getByTestId('auto-skeleton')).toHaveAttribute(
      'data-loading',
      'true'
    )
  })

  test('passes loading false to AutoSkeleton', () => {
    render(
      <ContentSkeleton loading={false}>
        <p>Loaded</p>
      </ContentSkeleton>
    )
    expect(screen.getByTestId('auto-skeleton')).toHaveAttribute(
      'data-loading',
      'false'
    )
  })

  test('applies custom className', () => {
    const { container } = render(
      <ContentSkeleton loading={false} className='my-skel'>
        <p>Content</p>
      </ContentSkeleton>
    )
    expect(container.querySelector('.my-skel')).toBeInTheDocument()
  })
})

describe('QuerySkeleton', () => {
  test('renders children when query is successful', () => {
    const query = {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any

    render(
      <QuerySkeleton query={query}>
        <p>Query data</p>
      </QuerySkeleton>
    )
    expect(screen.getByText('Query data')).toBeInTheDocument()
  })

  test('renders ErrorState when query has error', () => {
    const query = {
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any

    render(
      <QuerySkeleton query={query}>
        <p>Should not appear</p>
      </QuerySkeleton>
    )
    expect(
      screen.getByText('Oops! Something went wrong')
    ).toBeInTheDocument()
  })

  test('renders custom error title and description', () => {
    const query = {
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any

    render(
      <QuerySkeleton
        query={query}
        errorTitle='Load Failed'
        errorDescription='Could not load data'
      >
        <p>Data</p>
      </QuerySkeleton>
    )
    expect(screen.getByText('Load Failed')).toBeInTheDocument()
    expect(screen.getByText('Could not load data')).toBeInTheDocument()
  })

  test('shows loading skeleton when query is loading', () => {
    const query = {
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any

    render(
      <QuerySkeleton query={query}>
        <p>Content</p>
      </QuerySkeleton>
    )
    expect(screen.getByTestId('auto-skeleton')).toHaveAttribute(
      'data-loading',
      'true'
    )
  })

  test('retry button calls refetch on error', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const refetch = vi.fn()
    const query = {
      isLoading: false,
      isError: true,
      refetch,
    } as any

    render(
      <QuerySkeleton query={query}>
        <p>Data</p>
      </QuerySkeleton>
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })
})

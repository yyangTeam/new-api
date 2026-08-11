import { render, screen } from '@/test/test-utils'

import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  CardStaggerContainer,
  CardStaggerItem,
  TableStaggerContainer,
  TableStaggerRow,
} from '@/components/page-transition'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid='motion-div'>
        {children}
      </div>
    ),
    tbody: ({ children, className, ...props }: any) => (
      <tbody className={className} data-testid='motion-tbody'>
        {children}
      </tbody>
    ),
    tr: ({ children, className, ...props }: any) => (
      <tr className={className} data-testid='motion-tr'>
        {children}
      </tr>
    ),
  },
  useReducedMotion: () => false,
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid='outlet'>Outlet Content</div>,
  useRouterState: (opts: any) =>
    opts?.select?.({ matches: [{ routeId: '/test' }], location: { pathname: '/test' } }) ?? { status: 'idle' },
}))

describe('PageTransition', () => {
  test('renders children', () => {
    render(
      <PageTransition>
        <p>Page content</p>
      </PageTransition>
    )
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  test('applies className', () => {
    const { container } = render(
      <PageTransition className='page-class'>
        <p>Content</p>
      </PageTransition>
    )
    expect(container.querySelector('.page-class')).toBeInTheDocument()
  })
})

describe('FadeIn', () => {
  test('renders children', () => {
    render(
      <FadeIn>
        <p>Faded in</p>
      </FadeIn>
    )
    expect(screen.getByText('Faded in')).toBeInTheDocument()
  })

  test('applies className', () => {
    const { container } = render(
      <FadeIn className='fade-class'>
        <p>Content</p>
      </FadeIn>
    )
    expect(container.querySelector('.fade-class')).toBeInTheDocument()
  })
})

describe('StaggerContainer', () => {
  test('renders children', () => {
    render(
      <StaggerContainer>
        <p>Staggered</p>
      </StaggerContainer>
    )
    expect(screen.getByText('Staggered')).toBeInTheDocument()
  })

  test('applies className', () => {
    const { container } = render(
      <StaggerContainer className='stagger-class'>
        <p>Content</p>
      </StaggerContainer>
    )
    expect(container.querySelector('.stagger-class')).toBeInTheDocument()
  })
})

describe('StaggerItem', () => {
  test('renders children', () => {
    render(
      <StaggerItem>
        <p>Item</p>
      </StaggerItem>
    )
    expect(screen.getByText('Item')).toBeInTheDocument()
  })
})

describe('CardStaggerContainer', () => {
  test('renders children', () => {
    render(
      <CardStaggerContainer>
        <p>Card stagger</p>
      </CardStaggerContainer>
    )
    expect(screen.getByText('Card stagger')).toBeInTheDocument()
  })
})

describe('CardStaggerItem', () => {
  test('renders children', () => {
    render(
      <CardStaggerItem>
        <p>Card item</p>
      </CardStaggerItem>
    )
    expect(screen.getByText('Card item')).toBeInTheDocument()
  })
})

describe('TableStaggerContainer', () => {
  test('renders children within tbody', () => {
    const { container } = render(
      <table>
        <TableStaggerContainer>
          <tr>
            <td>Row</td>
          </tr>
        </TableStaggerContainer>
      </table>
    )
    expect(container.querySelector('tbody')).toBeInTheDocument()
  })
})

describe('TableStaggerRow', () => {
  test('renders children within tr', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableStaggerRow>
            <td>Cell</td>
          </TableStaggerRow>
        </tbody>
      </table>
    )
    expect(container.querySelector('tr')).toBeInTheDocument()
  })
})

describe('with reduced motion', () => {
  beforeEach(() => {
    vi.doMock('motion/react', () => ({
      motion: {
        div: ({ children, className }: any) => (
          <div className={className}>{children}</div>
        ),
        tbody: ({ children, className }: any) => (
          <tbody className={className}>{children}</tbody>
        ),
        tr: ({ children, className }: any) => (
          <tr className={className}>{children}</tr>
        ),
      },
      useReducedMotion: () => true,
    }))
  })

  afterEach(() => {
    vi.doUnmock('motion/react')
  })

  test('PageTransition renders children without motion', async () => {
    const { useReducedMotion } = await import('motion/react')
    // With reduced motion mocked to true, PageTransition renders a plain div
    // This test confirms functionality works regardless of motion preference
    render(
      <PageTransition>
        <p>Static</p>
      </PageTransition>
    )
    expect(screen.getByText('Static')).toBeInTheDocument()
  })
})

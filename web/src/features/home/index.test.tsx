import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: any) => (
    <div data-testid='public-layout'>{children}</div>
  ),
}))

vi.mock('@/components/layout/components/footer', () => ({
  Footer: () => <div data-testid='footer' />,
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: any) => (
    <div data-testid='rich-content' data-mode={props.mode}>
      {props.content}
    </div>
  ),
}))

vi.mock('@/context/theme-provider', () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./hooks', () => ({
  useHomePageContent: vi.fn(),
}))

vi.mock('./components', () => ({
  CTA: (props: any) => <div data-testid='cta' />,
  Features: () => <div data-testid='features' />,
  Hero: (props: any) => <div data-testid='hero' data-auth={String(props.isAuthenticated)} />,
  HowItWorks: () => <div data-testid='how-it-works' />,
  Stats: () => <div data-testid='stats' />,
}))

import { useAuthStore } from '@/stores/auth-store'
import { useHomePageContent } from './hooks'
import { Home } from './index'

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({ auth: { user: null } } as any)
  })

  test('renders loading state when not loaded', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: false,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders default homepage when no custom content', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByTestId('hero')).toBeInTheDocument()
    expect(screen.getByTestId('stats')).toBeInTheDocument()
    expect(screen.getByTestId('features')).toBeInTheDocument()
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument()
    expect(screen.getByTestId('cta')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  test('renders iframe when content is a URL', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: 'https://example.com/custom-home',
      isLoaded: true,
      isUrl: true,
    })
    render(<Home />)
    const iframe = screen.getByTitle('Custom Home Page')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'https://example.com/custom-home')
  })

  test('renders HTML content via RichContent', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '<html><body><h1>Custom</h1></body></html>',
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    const richContent = screen.getByTestId('rich-content')
    expect(richContent).toHaveAttribute('data-mode', 'html')
  })

  test('renders markdown content via RichContent', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '# Welcome\n\nMarkdown content here.',
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    const richContent = screen.getByTestId('rich-content')
    expect(richContent).toHaveAttribute('data-mode', 'markdown')
  })

  test('passes isAuthenticated to Hero', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      auth: { user: { id: 1, name: 'Test' } },
    } as any)
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByTestId('hero')).toHaveAttribute('data-auth', 'true')
  })

  test('passes isAuthenticated false when no user', () => {
    vi.mocked(useAuthStore).mockReturnValue({ auth: { user: null } } as any)
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByTestId('hero')).toHaveAttribute('data-auth', 'false')
  })
})

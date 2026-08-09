import { render, screen, waitFor } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: any) => (
    <div data-testid='public-layout'>{children}</div>
  ),
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: any) => (
    <div data-testid='rich-content' data-mode={props.mode}>
      {props.content}
    </div>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid='skeleton' className={props.className} />,
}))

vi.mock('./api', () => ({
  getAboutContent: vi.fn(),
}))

import { getAboutContent } from './api'
import { About } from './index'

describe('About', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading skeletons while fetching', () => {
    vi.mocked(getAboutContent).mockReturnValue(new Promise(() => {}))
    render(<About />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1)
  })

  test('renders empty state when no content returned', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: '',
    })
    render(<About />)
    await waitFor(() => {
      expect(screen.getByText('No About Content Set')).toBeInTheDocument()
    })
  })

  test('renders empty state when data is only whitespace', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: '   ',
    })
    render(<About />)
    await waitFor(() => {
      expect(screen.getByText('No About Content Set')).toBeInTheDocument()
    })
  })

  test('renders empty state when data is undefined', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: undefined,
    })
    render(<About />)
    await waitFor(() => {
      expect(screen.getByText('No About Content Set')).toBeInTheDocument()
    })
  })

  test('renders iframe when content is a URL', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: 'https://example.com/about',
    })
    render(<About />)
    await waitFor(() => {
      const iframe = screen.getByTitle('About')
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute('src', 'https://example.com/about')
    })
  })

  test('renders HTML content via RichContent with html mode', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: '<html><body><h1>Hello</h1></body></html>',
    })
    render(<About />)
    await waitFor(() => {
      const richContent = screen.getByTestId('rich-content')
      expect(richContent).toHaveAttribute('data-mode', 'html')
    })
  })

  test('renders markdown content via RichContent with markdown mode', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: '# Hello World\n\nSome markdown content',
    })
    render(<About />)
    await waitFor(() => {
      const richContent = screen.getByTestId('rich-content')
      expect(richContent).toHaveAttribute('data-mode', 'markdown')
    })
  })

  test('empty state contains project repository link', async () => {
    vi.mocked(getAboutContent).mockResolvedValue({
      success: true,
      message: 'ok',
      data: '',
    })
    render(<About />)
    await waitFor(() => {
      expect(
        screen.getByText('https://github.com/QuantumNous/new-api')
      ).toBeInTheDocument()
    })
  })
})

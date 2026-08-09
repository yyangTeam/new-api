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
    <div data-testid='rich-content' data-mode={props.mode} data-variant={props.htmlVariant}>
      {props.content}
    </div>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid='skeleton' className={props.className} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, render: renderProp, ...props }: any) => {
    if (renderProp) {
      return <span data-testid='button'>{renderProp}{children}</span>
    }
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid='card' {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid='card-content'>{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid='card-header'>{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid='card-title'>{children}</h3>,
}))

import { LegalDocument } from './legal-document'

describe('LegalDocument', () => {
  const defaultProps = {
    title: 'Test Document',
    queryKey: 'test-doc',
    fetchDocument: vi.fn(),
    emptyMessage: 'No document configured',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading skeletons while fetching', () => {
    defaultProps.fetchDocument.mockReturnValue(new Promise(() => {}))
    render(<LegalDocument {...defaultProps} />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1)
  })

  test('renders empty state when success is false', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: false,
      message: 'Not found',
      data: '',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument()
    })
  })

  test('renders empty state with emptyMessage when no message from API', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: false,
      data: '',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('No document configured')).toBeInTheDocument()
    })
  })

  test('renders empty state when content is empty', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: true,
      data: '   ',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('No document configured')).toBeInTheDocument()
    })
  })

  test('renders URL card when content is a URL', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: true,
      data: 'https://example.com/policy',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(
        screen.getByText(
          'The administrator configured an external link for this document.'
        )
      ).toBeInTheDocument()
      expect(screen.getByText('View document')).toBeInTheDocument()
    })
  })

  test('renders HTML content via RichContent with html mode', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: true,
      data: '<html><body><p>Policy</p></body></html>',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      const richContent = screen.getByTestId('rich-content')
      expect(richContent).toHaveAttribute('data-mode', 'html')
      expect(richContent).toHaveAttribute('data-variant', 'isolated')
    })
  })

  test('renders markdown content with title heading', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: true,
      data: '# Policy\n\nSome markdown content here',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      const richContent = screen.getByTestId('rich-content')
      expect(richContent).toHaveAttribute('data-mode', 'markdown')
      expect(screen.getByText('Test Document')).toBeInTheDocument()
    })
  })

  test('displays title in card header for empty state', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: false,
      data: '',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Document')
    })
  })

  test('displays title in card header for URL state', async () => {
    defaultProps.fetchDocument.mockResolvedValue({
      success: true,
      data: 'https://example.com',
    })
    render(<LegalDocument {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Document')
    })
  })
})

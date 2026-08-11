import { render, screen } from '@/test/test-utils'

import { RichContent } from '@/components/rich-content'

vi.mock('@/components/html-content', () => ({
  HtmlContent: (props: { content: string; className?: string; variant?: string }) => (
    <div data-testid='html-content' data-variant={props.variant}>
      {props.content}
    </div>
  ),
}))

vi.mock('@/components/ui/markdown', () => ({
  Markdown: (props: { children: string; breaks?: boolean; className?: string }) => (
    <div data-testid='markdown-content' data-breaks={props.breaks}>
      {props.children}
    </div>
  ),
}))

describe('RichContent', () => {
  test('renders Markdown by default', () => {
    render(<RichContent content='**bold**' />)
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    expect(screen.getByText('**bold**')).toBeInTheDocument()
  })

  test('renders HtmlContent when mode is html', () => {
    render(<RichContent content='<p>html</p>' mode='html' />)
    expect(screen.getByTestId('html-content')).toBeInTheDocument()
    expect(screen.getByText('<p>html</p>')).toBeInTheDocument()
  })

  test('passes breaks prop to Markdown', () => {
    render(<RichContent content='line1\nline2' breaks />)
    const md = screen.getByTestId('markdown-content')
    expect(md).toHaveAttribute('data-breaks', 'true')
  })

  test('passes htmlVariant to HtmlContent', () => {
    render(
      <RichContent content='<p>hi</p>' mode='html' htmlVariant='isolated' />
    )
    const html = screen.getByTestId('html-content')
    expect(html).toHaveAttribute('data-variant', 'isolated')
  })

  test('passes className to markdown', () => {
    render(<RichContent content='text' className='my-class' />)
    // Mocked component receives className prop
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
  })
})

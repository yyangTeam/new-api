import { render, screen } from '@/test/test-utils'

import { Markdown } from '@/components/ui/markdown'

describe('Markdown', () => {
  test('renders basic text', () => {
    render(<Markdown>Hello world</Markdown>)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Markdown className='custom-md'>Hello</Markdown>
    )
    expect(container.firstElementChild).toHaveClass('custom-md')
  })

  test('applies prose class', () => {
    const { container } = render(<Markdown>Content</Markdown>)
    expect(container.firstElementChild).toHaveClass('prose')
  })

  test('renders via dangerouslySetInnerHTML', () => {
    const { container } = render(<Markdown>Some text</Markdown>)
    // The component uses dangerouslySetInnerHTML to render parsed markdown
    const wrapper = container.firstElementChild
    expect(wrapper?.innerHTML).toBeTruthy()
  })

  test('renders emoji shortcodes', () => {
    const { container } = render(<Markdown>{'hello :star: world'}</Markdown>)
    // The star emoji shortcode should be replaced
    expect(container.textContent).toContain('⭐')
  })

  test('supports breaks option', () => {
    const { container } = render(
      <Markdown breaks>{'Line 1\nLine 2'}</Markdown>
    )
    // With breaks=true, line breaks should be converted to <br>
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('<br')
  })

  test('does not add breaks by default', () => {
    const { container } = render(<Markdown>{'Line 1\nLine 2'}</Markdown>)
    // Without breaks, simple newlines should not become <br>
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).not.toContain('<br')
  })

  test('renders empty string without error', () => {
    const { container } = render(<Markdown>{''}</Markdown>)
    expect(container.firstElementChild).toBeInTheDocument()
  })

  test('sanitizes script tags', () => {
    const { container } = render(
      <Markdown>{'<script>alert("xss")</script>'}</Markdown>
    )
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  test('renders strong text in HTML', () => {
    const { container } = render(<Markdown>**bold**</Markdown>)
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('<strong>')
  })

  test('renders emphasis in HTML', () => {
    const { container } = render(<Markdown>*italic*</Markdown>)
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('<em>')
  })

  test('renders inline code in HTML', () => {
    const { container } = render(<Markdown>{'Use `const x = 1`'}</Markdown>)
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('<code>')
  })

  test('renders link in HTML', () => {
    const { container } = render(
      <Markdown>[Click](https://example.com)</Markdown>
    )
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('<a')
    expect(html).toContain('https://example.com')
  })

  test('renders math block via katex', () => {
    const { container } = render(
      <Markdown>{'$$\nE = mc^2\n$$'}</Markdown>
    )
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('katex')
  })

  test('renders inline math via katex', () => {
    const { container } = render(<Markdown>{'$$x^2$$'}</Markdown>)
    const html = container.firstElementChild?.innerHTML ?? ''
    expect(html).toContain('katex')
  })
})

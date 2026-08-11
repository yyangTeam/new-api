import { render, screen } from '@/test/test-utils'

import { HtmlContent } from '@/components/html-content'

describe('HtmlContent', () => {
  describe('inline variant (default)', () => {
    test('renders sanitized HTML content', () => {
      render(<HtmlContent content='<p>Hello World</p>' />)
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    test('renders content without executing scripts', () => {
      render(
        <HtmlContent content='<p>Safe</p><script>alert("xss")</script>' />
      )
      expect(screen.getByText('Safe')).toBeInTheDocument()
    })

    test('applies prose classes for inline variant', () => {
      const { container } = render(
        <HtmlContent content='<p>Text</p>' />
      )
      expect(container.querySelector('.prose')).toBeInTheDocument()
    })

    test('applies custom className', () => {
      const { container } = render(
        <HtmlContent content='<p>Text</p>' className='my-content' />
      )
      expect(container.querySelector('.my-content')).toBeInTheDocument()
    })
  })

  describe('isolated variant', () => {
    test('renders a container div for shadow root', () => {
      const { container } = render(
        <HtmlContent content='<p>Isolated</p>' variant='isolated' />
      )
      expect(container.querySelector('div')).toBeInTheDocument()
    })

    test('does not use dangerouslySetInnerHTML directly in DOM', () => {
      const { container } = render(
        <HtmlContent content='<p>Isolated</p>' variant='isolated' />
      )
      expect(container.querySelector('.prose')).toBeNull()
    })

    test('applies custom className to isolated container', () => {
      const { container } = render(
        <HtmlContent
          content='<p>Isolated</p>'
          variant='isolated'
          className='iso-class'
        />
      )
      expect(container.querySelector('.iso-class')).toBeInTheDocument()
    })
  })
})

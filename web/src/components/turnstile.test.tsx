import { render } from '@/test/test-utils'

import { Turnstile } from './turnstile'

describe('Turnstile', () => {
  test('renders a div container', () => {
    const onVerify = vi.fn()
    const { container } = render(
      <Turnstile siteKey='test-key' onVerify={onVerify} />
    )
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const onVerify = vi.fn()
    const { container } = render(
      <Turnstile
        siteKey='test-key'
        onVerify={onVerify}
        className='custom-turnstile'
      />
    )
    const div = container.firstElementChild
    expect(div).toHaveClass('custom-turnstile')
  })

  test('calls window.turnstile.render when available', () => {
    const mockRender = vi.fn()
    window.turnstile = { render: mockRender }

    const onVerify = vi.fn()
    render(<Turnstile siteKey='my-key' onVerify={onVerify} />)

    expect(mockRender).toHaveBeenCalledTimes(1)
    expect(mockRender.mock.calls[0][1]).toMatchObject({
      sitekey: 'my-key',
    })

    delete window.turnstile
  })

  test('creates script tag when turnstile not available', () => {
    delete window.turnstile
    const onVerify = vi.fn()
    render(<Turnstile siteKey='key' onVerify={onVerify} />)

    const script = document.getElementById('cf-turnstile')
    expect(script).toBeInTheDocument()

    // Cleanup
    script?.remove()
  })
})

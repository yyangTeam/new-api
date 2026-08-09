import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a
      href={to}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
      {...props}
    >
      {children}
    </a>
  ),
}))

import { ModelLink, VendorLink } from './entity-links'

describe('ModelLink', () => {
  test('renders model name as default children', () => {
    render(<ModelLink modelName='gpt-4o' />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  test('renders custom children when provided', () => {
    render(<ModelLink modelName='gpt-4o'>Custom Label</ModelLink>)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument()
  })

  test('links to /pricing/$modelId', () => {
    render(<ModelLink modelName='claude-3-opus' />)
    const link = screen.getByText('claude-3-opus')
    expect(link).toHaveAttribute('href', '/pricing/$modelId')
    expect(link).toHaveAttribute(
      'data-params',
      JSON.stringify({ modelId: 'claude-3-opus' })
    )
  })

  test('applies custom className', () => {
    render(<ModelLink modelName='test' className='custom-class' />)
    const link = screen.getByText('test')
    expect(link.className).toContain('custom-class')
  })
})

describe('VendorLink', () => {
  test('renders vendor name as default children', () => {
    render(<VendorLink vendor='OpenAI' />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  test('renders custom children when provided', () => {
    render(<VendorLink vendor='OpenAI'>Custom Vendor</VendorLink>)
    expect(screen.getByText('Custom Vendor')).toBeInTheDocument()
    expect(screen.queryByText('OpenAI')).not.toBeInTheDocument()
  })

  test('links to /pricing with vendor search param', () => {
    render(<VendorLink vendor='Anthropic' />)
    const link = screen.getByText('Anthropic')
    expect(link).toHaveAttribute('href', '/pricing')
    expect(link).toHaveAttribute(
      'data-search',
      JSON.stringify({ vendor: 'Anthropic' })
    )
  })

  test('applies custom className', () => {
    render(<VendorLink vendor='Google' className='my-class' />)
    const link = screen.getByText('Google')
    expect(link.className).toContain('my-class')
  })
})

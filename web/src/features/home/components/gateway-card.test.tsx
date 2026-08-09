import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr data-testid='separator' {...props} />,
}))

import { GatewayCard } from './gateway-card'

describe('GatewayCard', () => {
  const defaultProps = {
    logo: '/logo.png',
    systemName: 'NewAPI',
  }

  test('renders system name', () => {
    render(<GatewayCard {...defaultProps} />)
    expect(screen.getByText('NewAPI')).toBeInTheDocument()
  })

  test('renders logo image with alt text', () => {
    render(<GatewayCard {...defaultProps} />)
    const img = screen.getByAltText('NewAPI')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/logo.png')
  })

  test('renders gateway features', () => {
    render(<GatewayCard {...defaultProps} />)
    expect(screen.getByText('Cost Tracking')).toBeInTheDocument()
    expect(screen.getByText('Load Balancing')).toBeInTheDocument()
    expect(screen.getByText('Rate Limiting')).toBeInTheDocument()
    expect(screen.getByText('Observability')).toBeInTheDocument()
  })

  test('renders all 10 features', () => {
    const { container } = render(<GatewayCard {...defaultProps} />)
    const featureItems = container.querySelectorAll('.grid-cols-2 > div')
    expect(featureItems.length).toBe(10)
  })
})

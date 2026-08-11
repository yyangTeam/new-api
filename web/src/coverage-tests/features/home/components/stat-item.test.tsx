import { render, screen } from '@testing-library/react'

import { StatItem } from '@/features/home/components/stat-item'

describe('StatItem', () => {
  test('renders value', () => {
    render(<StatItem value='50' />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  test('renders numeric value', () => {
    render(<StatItem value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  test('renders suffix when provided', () => {
    render(<StatItem value='50' suffix='+' />)
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  test('does not render suffix when not provided', () => {
    const { container } = render(<StatItem value='50' />)
    // Only the value div should exist
    const baselineItems = container.querySelectorAll('.flex.items-baseline > div')
    expect(baselineItems.length).toBe(1)
  })

  test('renders description when provided', () => {
    render(<StatItem value='50' description='upstream services' />)
    expect(screen.getByText('upstream services')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    const { container } = render(<StatItem value='50' />)
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  test('renders all three parts together', () => {
    render(<StatItem value='100' suffix='+' description='models supported' />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
    expect(screen.getByText('models supported')).toBeInTheDocument()
  })
})

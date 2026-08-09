import { render, screen } from '@testing-library/react'

import { FeatureItem } from './feature-item'

describe('FeatureItem', () => {
  const defaultProps = {
    title: 'Fast Feature',
    description: 'This is a fast feature',
    icon: <svg data-testid='feature-icon' />,
  }

  test('renders title', () => {
    render(<FeatureItem {...defaultProps} />)
    expect(screen.getByText('Fast Feature')).toBeInTheDocument()
  })

  test('renders description', () => {
    render(<FeatureItem {...defaultProps} />)
    expect(screen.getByText('This is a fast feature')).toBeInTheDocument()
  })

  test('renders icon', () => {
    render(<FeatureItem {...defaultProps} />)
    expect(screen.getByTestId('feature-icon')).toBeInTheDocument()
  })

  test('renders with different props', () => {
    render(
      <FeatureItem
        title='Secure'
        description='Very secure'
        icon={<span data-testid='shield' />}
      />
    )
    expect(screen.getByText('Secure')).toBeInTheDocument()
    expect(screen.getByText('Very secure')).toBeInTheDocument()
    expect(screen.getByTestId('shield')).toBeInTheDocument()
  })
})

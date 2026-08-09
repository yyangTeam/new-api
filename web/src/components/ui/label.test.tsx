import { render, screen } from '@/test/test-utils'

import { Label } from './label'

describe('Label', () => {
  test('renders label text', () => {
    render(<Label>Username</Label>)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  test('renders as label element', () => {
    const { container } = render(<Label>Email</Label>)
    expect(container.querySelector('label')).toBeInTheDocument()
  })

  test('has data-slot attribute', () => {
    const { container } = render(<Label>Name</Label>)
    expect(
      container.querySelector('[data-slot="label"]')
    ).toBeInTheDocument()
  })

  test('forwards htmlFor prop', () => {
    const { container } = render(<Label htmlFor='input-1'>Field</Label>)
    const label = container.querySelector('label')!
    expect(label).toHaveAttribute('for', 'input-1')
  })

  test('applies custom className', () => {
    render(<Label className='text-lg'>Big Label</Label>)
    const label = screen.getByText('Big Label')
    expect(label.className).toContain('text-lg')
  })
})

import { render, screen } from '@testing-library/react'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (name: string, size: number) => (
    <span data-testid='lobe-icon' data-name={name} data-size={size} />
  ),
}))

import { IconCard } from '@/features/home/components/icon-card'

describe('IconCard', () => {
  test('renders with icon name', () => {
    render(<IconCard iconName='OpenAI' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-name', 'OpenAI')
  })

  test('uses default size of 32', () => {
    render(<IconCard iconName='OpenAI' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-size', '32')
  })

  test('uses custom size', () => {
    render(<IconCard iconName='Claude' size={48} />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-size', '48')
  })

  test('applies custom className', () => {
    const { container } = render(
      <IconCard iconName='Test' className='custom-class' />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('custom-class')
  })

  test('has glass-morphism class', () => {
    const { container } = render(<IconCard iconName='Test' />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('glass-morphism')
  })
})

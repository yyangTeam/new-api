import { render, screen, userEvent } from '@/test/test-utils'

import { Input } from './input'

describe('Input', () => {
  test('renders an input element', () => {
    render(<Input placeholder='Enter text' />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  test('has data-slot attribute', () => {
    render(<Input data-testid='test-input' />)
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('data-slot', 'input')
  })

  test('applies type prop', () => {
    render(<Input type='email' data-testid='email' />)
    expect(screen.getByTestId('email')).toHaveAttribute('type', 'email')
  })

  test('is disabled when disabled prop is set', () => {
    render(<Input disabled data-testid='disabled-input' />)
    expect(screen.getByTestId('disabled-input')).toBeDisabled()
  })

  test('applies custom className', () => {
    render(<Input className='w-full' data-testid='styled' />)
    expect(screen.getByTestId('styled').className).toContain('w-full')
  })

  test('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input data-testid='input' />)
    const input = screen.getByTestId('input')
    await user.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })
})

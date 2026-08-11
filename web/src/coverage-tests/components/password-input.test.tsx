import { render, screen, userEvent } from '@/test/test-utils'

import { PasswordInput } from '@/components/password-input'

describe('PasswordInput', () => {
  test('renders as password type by default', () => {
    render(<PasswordInput />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'password')
  })

  test('toggles to text type when toggle button is clicked', async () => {
    const user = userEvent.setup()
    render(<PasswordInput />)
    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle password visibility',
    })
    await user.click(toggleBtn)
    expect(document.querySelector('input')).toHaveAttribute('type', 'text')
  })

  test('toggles back to password type on second click', async () => {
    const user = userEvent.setup()
    render(<PasswordInput />)
    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle password visibility',
    })
    await user.click(toggleBtn)
    await user.click(toggleBtn)
    expect(document.querySelector('input')).toHaveAttribute('type', 'password')
  })

  test('disables input when disabled prop is true', () => {
    render(<PasswordInput disabled />)
    expect(document.querySelector('input')).toBeDisabled()
  })

  test('disables toggle button when disabled prop is true', () => {
    render(<PasswordInput disabled />)
    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle password visibility',
    })
    expect(toggleBtn).toBeDisabled()
  })

  test('applies custom className', () => {
    const { container } = render(<PasswordInput className='w-full' />)
    expect(container.querySelector('.w-full')).toBeInTheDocument()
  })

  test('forwards additional input props', () => {
    render(<PasswordInput placeholder='Enter password' />)
    expect(
      document.querySelector('input[placeholder="Enter password"]')
    ).toBeInTheDocument()
  })
})

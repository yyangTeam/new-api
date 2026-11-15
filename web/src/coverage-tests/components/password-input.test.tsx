import { render, screen, userEvent } from '@/test/test-utils'

import { PasswordInput } from '@/components/password-input'

describe('PasswordInput', () => {
  test('renders as password type by default', () => {
    render(<PasswordInput />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'password')
  })

  // The toggle's accessible label is state-dependent (upstream 938a35bdf):
  // "Show password" while hidden, "Hide password" while revealed.
  test('toggles to text type when toggle button is clicked', async () => {
    const user = userEvent.setup()
    render(<PasswordInput />)
    const toggleBtn = screen.getByRole('button', { name: 'Show password' })
    await user.click(toggleBtn)
    expect(document.querySelector('input')).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: 'Hide password' })
    ).toBeInTheDocument()
  })

  test('toggles back to password type on second click', async () => {
    const user = userEvent.setup()
    render(<PasswordInput />)
    const toggleBtn = screen.getByRole('button', { name: 'Show password' })
    await user.click(toggleBtn)
    await user.click(toggleBtn)
    expect(document.querySelector('input')).toHaveAttribute('type', 'password')
    expect(
      screen.getByRole('button', { name: 'Show password' })
    ).toBeInTheDocument()
  })

  test('disables input when disabled prop is true', () => {
    render(<PasswordInput disabled />)
    expect(document.querySelector('input')).toBeDisabled()
  })

  test('disables toggle button when disabled prop is true', () => {
    render(<PasswordInput disabled />)
    const toggleBtn = screen.getByRole('button', { name: 'Show password' })
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

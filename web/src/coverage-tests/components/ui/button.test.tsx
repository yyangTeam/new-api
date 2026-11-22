import { render, screen, userEvent } from '@/test/test-utils'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  test('renders with default variant', () => {
    render(<Button>Click me</Button>)
    const btn = screen.getByRole('button', { name: 'Click me' })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('bg-primary')
  })

  test('renders with outline variant', () => {
    render(<Button variant='outline'>Outline</Button>)
    const btn = screen.getByRole('button', { name: 'Outline' })
    expect(btn.className).toContain('border-border')
  })

  test('renders with secondary variant', () => {
    render(<Button variant='secondary'>Secondary</Button>)
    const btn = screen.getByRole('button', { name: 'Secondary' })
    expect(btn.className).toContain('bg-secondary')
  })

  test('renders with ghost variant', () => {
    render(<Button variant='ghost'>Ghost</Button>)
    const btn = screen.getByRole('button', { name: 'Ghost' })
    expect(btn.className).toContain('hover:bg-muted')
  })

  test('renders with destructive variant', () => {
    render(<Button variant='destructive'>Delete</Button>)
    const btn = screen.getByRole('button', { name: 'Delete' })
    expect(btn.className).toContain('destructive')
  })

  test('renders with link variant', () => {
    render(<Button variant='link'>Link</Button>)
    const btn = screen.getByRole('button', { name: 'Link' })
    expect(btn.className).toContain('underline-offset-4')
  })

  test('renders with icon size', () => {
    render(<Button size='icon'>X</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('size-8')
  })

  test('renders with sm size', () => {
    render(<Button size='sm'>Small</Button>)
    const btn = screen.getByRole('button', { name: 'Small' })
    expect(btn.className).toContain('h-7')
  })

  test('renders with lg size', () => {
    render(<Button size='lg'>Large</Button>)
    const btn = screen.getByRole('button', { name: 'Large' })
    expect(btn.className).toContain('h-9')
  })

  test('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  test('fires onClick handler', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Action</Button>)
    await user.click(screen.getByRole('button', { name: 'Action' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('applies custom className', () => {
    render(<Button className='w-full'>Full</Button>)
    const btn = screen.getByRole('button', { name: 'Full' })
    expect(btn.className).toContain('w-full')
  })

  test('has data-slot attribute', () => {
    render(<Button>Slot</Button>)
    const btn = screen.getByRole('button', { name: 'Slot' })
    expect(btn).toHaveAttribute('data-slot', 'button')
  })

  test('renders with type button by default', () => {
    render(<Button>Btn</Button>)
    const btn = screen.getByRole('button', { name: 'Btn' })
    expect(btn).toHaveAttribute('type', 'button')
  })
})

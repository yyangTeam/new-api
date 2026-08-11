import { render, screen } from '@/test/test-utils'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'

describe('Alert', () => {
  test('renders with alert role', () => {
    render(<Alert>Alert content</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  test('renders with data-slot attribute', () => {
    const { container } = render(<Alert>A</Alert>)
    expect(container.querySelector('[data-slot="alert"]')).toBeInTheDocument()
  })

  test('renders with default variant', () => {
    render(<Alert>Default alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('bg-card')
  })

  test('renders with destructive variant', () => {
    render(<Alert variant='destructive'>Error!</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('text-destructive')
  })

  test('applies custom className', () => {
    render(<Alert className='my-alert'>Custom</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('my-alert')
  })
})

describe('AlertTitle', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<AlertTitle>Title</AlertTitle>)
    expect(
      container.querySelector('[data-slot="alert-title"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<AlertTitle>Warning!</AlertTitle>)
    expect(screen.getByText('Warning!')).toBeInTheDocument()
  })
})

describe('AlertDescription', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <AlertDescription>Desc</AlertDescription>
    )
    expect(
      container.querySelector('[data-slot="alert-description"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<AlertDescription>Something happened</AlertDescription>)
    expect(screen.getByText('Something happened')).toBeInTheDocument()
  })
})

describe('AlertAction', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<AlertAction>X</AlertAction>)
    expect(
      container.querySelector('[data-slot="alert-action"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<AlertAction><button type='button'>Dismiss</button></AlertAction>)
    expect(
      screen.getByRole('button', { name: 'Dismiss' })
    ).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { go: vi.fn() } }),
}))

import { ForbiddenError } from './forbidden'
import { GeneralError } from './general-error'
import { MaintenanceError } from './maintenance-error'
import { NotFoundError } from './not-found-error'
import { UnauthorisedError } from './unauthorized-error'

describe('UnauthorisedError (401)', () => {
  test('renders 401 status code', () => {
    render(<UnauthorisedError />)
    expect(screen.getByText('401')).toBeInTheDocument()
  })

  test('displays unauthorized access message', () => {
    render(<UnauthorisedError />)
    expect(screen.getByText('Unauthorized Access')).toBeInTheDocument()
  })

  test('renders Go Back and Back to Home buttons', () => {
    render(<UnauthorisedError />)
    expect(
      screen.getByRole('button', { name: 'Go Back' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Back to Home' })
    ).toBeInTheDocument()
  })
})

describe('ForbiddenError (403)', () => {
  test('renders 403 status code', () => {
    render(<ForbiddenError />)
    expect(screen.getByText('403')).toBeInTheDocument()
  })

  test('displays access forbidden message', () => {
    render(<ForbiddenError />)
    expect(screen.getByText('Access Forbidden')).toBeInTheDocument()
  })

  test('renders navigation buttons', () => {
    render(<ForbiddenError />)
    expect(
      screen.getByRole('button', { name: 'Go Back' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Back to Home' })
    ).toBeInTheDocument()
  })
})

describe('NotFoundError (404)', () => {
  test('renders 404 status code', () => {
    render(<NotFoundError />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  test('displays page not found message', () => {
    render(<NotFoundError />)
    expect(screen.getByText('Oops! Page Not Found!')).toBeInTheDocument()
  })

  test('renders navigation buttons', () => {
    render(<NotFoundError />)
    expect(
      screen.getByRole('button', { name: 'Go Back' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Back to Home' })
    ).toBeInTheDocument()
  })
})

describe('GeneralError (500)', () => {
  test('renders 500 status code by default when no error provided', () => {
    render(<GeneralError />)
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  test('displays generic error title', () => {
    render(<GeneralError />)
    expect(
      screen.getByText("Oops! Something went wrong :')"),
      'Should show the default error title'
    ).toBeInTheDocument()
  })

  test('extracts and displays HTTP status from error response', () => {
    const error = { response: { status: 502 } }
    render(<GeneralError error={error} />)
    expect(screen.getByText('502')).toBeInTheDocument()
  })

  test('shows rate-limited messaging for 429 errors', () => {
    const error = { response: { status: 429 } }
    const { container } = render(<GeneralError error={error} />)
    expect(screen.getByText('Too many requests')).toBeInTheDocument()
    expect(container.textContent).toContain(
      'Please wait a moment before trying again.'
    )
  })

  test('renders "Report an issue" link', () => {
    render(<GeneralError />)
    expect(screen.getByText('Report an issue')).toBeInTheDocument()
  })

  test('hides status code and navigation in minimal mode', () => {
    render(<GeneralError minimal />)
    expect(screen.queryByText('500')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Go Back' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Back to Home' })
    ).not.toBeInTheDocument()
  })

  test('still shows error title in minimal mode', () => {
    render(<GeneralError minimal />)
    expect(
      screen.getByText("Oops! Something went wrong :')"),
      'Title should still be visible in minimal mode'
    ).toBeInTheDocument()
  })
})

describe('MaintenanceError (503)', () => {
  test('renders 503 status code', () => {
    render(<MaintenanceError />)
    expect(screen.getByText('503')).toBeInTheDocument()
  })

  test('displays maintenance message', () => {
    render(<MaintenanceError />)
    expect(
      screen.getByText('Website is under maintenance!')
    ).toBeInTheDocument()
  })

  test('renders learn more button', () => {
    render(<MaintenanceError />)
    expect(
      screen.getByRole('button', { name: 'Learn more' })
    ).toBeInTheDocument()
  })
})

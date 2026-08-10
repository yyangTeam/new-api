import { render, screen, waitFor, userEvent } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { go: vi.fn() } }),
}))

import { ForbiddenError } from './forbidden'
import { GeneralError } from './general-error'
import { MaintenanceError } from './maintenance-error'
import { NotFoundError } from './not-found-error'
import { UnauthorisedError } from './unauthorized-error'

describe('Error pages - additional branch coverage', () => {
  describe('GeneralError', () => {
    test('handles null error gracefully', () => {
      render(<GeneralError error={null} />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    test('handles undefined response in error object', () => {
      const error = { response: null }
      render(<GeneralError error={error} />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    test('handles non-number status in response', () => {
      const error = { response: { status: 'bad' } }
      render(<GeneralError error={error} />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    test('handles error that is not an object', () => {
      render(<GeneralError error='string error' />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    test('handles error as number', () => {
      render(<GeneralError error={42} />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    test('shows 429 status code for rate limited error', () => {
      const error = { response: { status: 429 } }
      render(<GeneralError error={error} />)
      expect(screen.getByText('429')).toBeInTheDocument()
    })

    test('shows correct title for rate limited error', () => {
      const error = { response: { status: 429 } }
      render(<GeneralError error={error} />)
      expect(screen.getByText('Too many requests')).toBeInTheDocument()
    })

    test('shows correct description for rate limited error', () => {
      const error = { response: { status: 429 } }
      const { container } = render(<GeneralError error={error} />)
      expect(container.textContent).toContain(
        'Please wait a moment before trying again.'
      )
    })

    test('renders Report an issue link with correct href', () => {
      render(<GeneralError />)
      const link = screen.getByText('Report an issue').closest('a')
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/QuantumNous/new-api/issues'
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    test('accepts custom className', () => {
      const { container } = render(
        <GeneralError className='custom-class' />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    test('minimal mode hides Report an issue link', () => {
      render(<GeneralError minimal />)
      expect(
        screen.queryByText('Report an issue')
      ).not.toBeInTheDocument()
    })

    test('minimal mode still shows error description', () => {
      const { container } = render(<GeneralError minimal />)
      expect(container.textContent).toContain(
        'We apologize for the inconvenience.'
      )
    })

    test('shows apology text in full mode', () => {
      const { container } = render(<GeneralError />)
      expect(container.textContent).toContain(
        'We apologize for the inconvenience.'
      )
    })

    test('shows GitHub issues suggestion in full mode', () => {
      render(<GeneralError />)
      expect(
        screen.getByText(
          'If this keeps happening, please report it on GitHub Issues.'
        )
      ).toBeInTheDocument()
    })

    test('hides GitHub issues suggestion in minimal mode', () => {
      render(<GeneralError minimal />)
      expect(
        screen.queryByText(
          'If this keeps happening, please report it on GitHub Issues.'
        )
      ).not.toBeInTheDocument()
    })

    test('rate limited minimal mode shows correct title without code', () => {
      const error = { response: { status: 429 } }
      render(<GeneralError error={error} minimal />)
      expect(screen.getByText('Too many requests')).toBeInTheDocument()
      expect(screen.queryByText('429')).not.toBeInTheDocument()
    })

    test('displays custom status code from error response', () => {
      const error = { response: { status: 503 } }
      render(<GeneralError error={error} />)
      expect(screen.getByText('503')).toBeInTheDocument()
    })
  })

  describe('ForbiddenError', () => {
    test('renders permission description text', () => {
      const { container } = render(<ForbiddenError />)
      expect(container.textContent).toContain(
        "You don't have necessary permission"
      )
      expect(container.textContent).toContain(
        'to view this resource.'
      )
    })
  })

  describe('NotFoundError', () => {
    test('renders description text', () => {
      const { container } = render(<NotFoundError />)
      expect(container.textContent).toContain(
        "It seems like the page you're looking for"
      )
      expect(container.textContent).toContain(
        'does not exist or might have been removed.'
      )
    })
  })

  describe('UnauthorisedError', () => {
    test('renders credential prompt text', () => {
      const { container } = render(<UnauthorisedError />)
      expect(container.textContent).toContain(
        'Please log in with the appropriate credentials'
      )
      expect(container.textContent).toContain(
        'to access this resource.'
      )
    })
  })

  describe('MaintenanceError', () => {
    test('renders maintenance description', () => {
      const { container } = render(<MaintenanceError />)
      expect(container.textContent).toContain(
        'The site is not available at the moment.'
      )
      expect(container.textContent).toContain(
        "We'll be back online shortly."
      )
    })
  })
})

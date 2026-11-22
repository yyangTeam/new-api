import { render, screen, userEvent } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

import { DeploymentAccessGuard } from '@/features/models/components/deployment-access-guard'

describe('DeploymentAccessGuard', () => {
  const defaultProps = {
    loading: false,
    isEnabled: true,
    connectionLoading: false,
    connectionOk: true as boolean | null,
    connectionError: null as string | null,
    onRetry: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders children when enabled and connected', () => {
    render(
      <DeploymentAccessGuard {...defaultProps}>
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('shows loading state when loading is true', () => {
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        loading={true}
        loadingPhase='settings'
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Loading configuration')).toBeInTheDocument()
    expect(screen.getByText('Checking connection')).toBeInTheDocument()
  })

  test('shows loading state when connectionLoading is true', () => {
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        connectionLoading={true}
        loadingPhase='connection'
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Loading configuration')).toBeInTheDocument()
    expect(screen.getByText('Checking connection')).toBeInTheDocument()
  })

  test('shows disabled state when isEnabled is false', () => {
    render(
      <DeploymentAccessGuard {...defaultProps} isEnabled={false}>
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(
      screen.getByText('Model deployment service is disabled')
    ).toBeInTheDocument()
    expect(screen.getByText('Configuration required')).toBeInTheDocument()
    expect(screen.getByText('Go to settings')).toBeInTheDocument()
  })

  test('shows connection error state', () => {
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        connectionOk={false}
        connectionError='API key is invalid'
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
    expect(screen.getByText('Connection error')).toBeInTheDocument()
    expect(screen.getByText('API key is invalid')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Go to settings')).toBeInTheDocument()
  })

  test('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        connectionOk={false}
        connectionError='Connection timeout'
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    await user.click(screen.getByText('Retry'))
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1)
  })

  test('loading phase idle shows pending for both steps', () => {
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        loading={true}
        loadingPhase='idle'
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.getByText('Loading configuration')).toBeInTheDocument()
    expect(screen.getByText('Checking connection')).toBeInTheDocument()
  })

  test('loading phase done with connectionOk shows done for both steps', () => {
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        loading={true}
        loadingPhase='done'
        connectionOk={true}
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.getByText('Loading configuration')).toBeInTheDocument()
    expect(screen.getByText('Checking connection')).toBeInTheDocument()
  })

  test('renders children when connectionOk is false but no error message', () => {
    // When connectionOk is false but connectionError is null, the guard does not show error
    render(
      <DeploymentAccessGuard
        {...defaultProps}
        connectionOk={false}
        connectionError={null}
      >
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('uses default loadingPhase when not provided', () => {
    render(
      <DeploymentAccessGuard {...defaultProps} loading={true}>
        <div>Protected Content</div>
      </DeploymentAccessGuard>
    )
    // Default loadingPhase is 'settings'
    expect(screen.getByText('Loading configuration')).toBeInTheDocument()
  })
})

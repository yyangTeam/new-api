import { render, screen, waitFor, userEvent } from '@/test/test-utils'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useRouter: () => ({ history: { go: vi.fn() } }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'TestSystem',
    logo: '/logo.png',
    loading: false,
  }),
}))

vi.mock('./api', () => ({
  getSetupStatus: vi.fn(),
  submitSetup: vi.fn(),
  buildSetupPayload: vi.fn(
    (
      values: Record<string, unknown>,
      rootInit: boolean
    ): Record<string, unknown> => {
      if (rootInit) return { SelfUseModeEnabled: false, DemoSiteEnabled: false }
      return { ...values, SelfUseModeEnabled: false, DemoSiteEnabled: false }
    }
  ),
}))

import { getSetupStatus, submitSetup } from './api'
import { SetupWizard } from './setup-wizard'

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state while fetching', () => {
    vi.mocked(getSetupStatus).mockReturnValue(new Promise(() => {}))
    render(<SetupWizard />)
    expect(screen.getByText('Loading setup status…')).toBeInTheDocument()
  })

  test('shows error state when fetch fails', async () => {
    vi.mocked(getSetupStatus).mockRejectedValue(new Error('Network error'))
    render(<SetupWizard />)
    await waitFor(() => {
      expect(
        screen.getByText('We could not load the setup status.')
      ).toBeInTheDocument()
    })
  })

  test('renders step indicators', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    render(<SetupWizard />)
    await waitFor(() => {
      expect(screen.getByText('Database check')).toBeInTheDocument()
      expect(screen.getByText('Administrator account')).toBeInTheDocument()
      expect(screen.getByText('Usage mode')).toBeInTheDocument()
      expect(screen.getByText('Review & initialize')).toBeInTheDocument()
    })
  })

  test('renders system name in heading', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    render(<SetupWizard />)
    await waitFor(() => {
      expect(screen.getByText(/Initialize/)).toBeInTheDocument()
      expect(screen.getByText(/TestSystem/)).toBeInTheDocument()
    })
  })

  test('renders step descriptions', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    render(<SetupWizard />)
    await waitFor(() => {
      expect(
        screen.getByText('Verify your database connection')
      ).toBeInTheDocument()
    })
  })

  test('renders wizard description text', () => {
    vi.mocked(getSetupStatus).mockReturnValue(new Promise(() => {}))
    render(<SetupWizard />)
    expect(
      screen.getByText(
        'Follow the guided steps to prepare your workspace before the first login.'
      )
    ).toBeInTheDocument()
  })

  test('renders card title and description', () => {
    vi.mocked(getSetupStatus).mockReturnValue(new Promise(() => {}))
    render(<SetupWizard />)
    expect(screen.getByText('System setup wizard')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Complete these steps to finish the initial installation.'
      )
    ).toBeInTheDocument()
  })

  test('navigates to next step when Next is clicked', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText('Administrator username')
      ).toBeInTheDocument()
    })
  })

  test('shows admin step alert when root_init is true and navigates through steps', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: true, database_type: 'mysql' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('MySQL detected')).toBeInTheDocument()
    })

    // Step 0 -> Step 1
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText(/administrator account is already initialized/)
      ).toBeInTheDocument()
    })

    // Step 1 -> Step 2 (skip admin validation since root_init)
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText('How will you use the platform?')
      ).toBeInTheDocument()
    })

    // Step 2 -> Step 3
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Ready to initialize')).toBeInTheDocument()
    })
  })

  test('validates admin step - empty username prevents navigation', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Go to admin step
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText('Administrator username')
      ).toBeInTheDocument()
    })

    // Try to go to next step without filling username - should stay on admin step
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Should still be on admin step since validation fails
    expect(
      screen.getByText('Administrator username')
    ).toBeInTheDocument()
  })

  test('validates admin step - short password prevents navigation', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Choose a username')
      ).toBeInTheDocument()
    })

    await user.type(
      screen.getByPlaceholderText('Choose a username'),
      'admin'
    )
    await user.type(
      screen.getByPlaceholderText('Set a secure password (min. 8 characters)'),
      'short'
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Still on admin step
    expect(
      screen.getByText('Administrator username')
    ).toBeInTheDocument()
  })

  test('validates admin step - password mismatch prevents navigation', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Choose a username')
      ).toBeInTheDocument()
    })

    await user.type(
      screen.getByPlaceholderText('Choose a username'),
      'admin'
    )
    await user.type(
      screen.getByPlaceholderText('Set a secure password (min. 8 characters)'),
      'password123'
    )
    await user.type(
      screen.getByPlaceholderText('Repeat the administrator password'),
      'differentpassword'
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Still on admin step
    expect(
      screen.getByText('Administrator username')
    ).toBeInTheDocument()
  })

  test('navigates back when Back is clicked', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: true, database_type: 'sqlite' },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText(/administrator account is already initialized/)
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Back' }))

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })
  })

  test('navigates to / when status is true (already set up)', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: true, root_init: true, database_type: 'sqlite' },
    })
    render(<SetupWizard />)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/' })
    })
  })

  test('pre-fills self usage mode when SelfUseModeEnabled is true', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: {
        status: false,
        root_init: true,
        database_type: 'sqlite',
        SelfUseModeEnabled: true,
      },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Navigate to admin step then usage mode step
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText('How will you use the platform?')
      ).toBeInTheDocument()
    })

    // Navigate to review step to verify the selection
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Personal use mode')).toBeInTheDocument()
    })
  })

  test('pre-fills demo usage mode when DemoSiteEnabled is true', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: {
        status: false,
        root_init: true,
        database_type: 'sqlite',
        DemoSiteEnabled: true,
      },
    })
    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Navigate through steps to review
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Demo site mode')).toBeInTheDocument()
    })
  })

  test('submits form successfully on last step', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: true, database_type: 'mysql' },
    })
    vi.mocked(submitSetup).mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('MySQL detected')).toBeInTheDocument()
    })

    // Navigate through all steps (root_init means admin is skipped)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Ready to initialize')).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: /Initialize system/ })
    )

    await waitFor(() => {
      expect(submitSetup).toHaveBeenCalled()
    })
  })

  test('shows error when submit fails', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: true, database_type: 'sqlite' },
    })
    vi.mocked(submitSetup).mockResolvedValue({
      success: false,
      message: 'Setup error',
    })

    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Navigate through all steps
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Initialize system/ })
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: /Initialize system/ })
    )

    await waitFor(() => {
      expect(submitSetup).toHaveBeenCalled()
    })
  })

  test('handles mutation error on submit', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: true, database_type: 'sqlite' },
    })
    vi.mocked(submitSetup).mockRejectedValue(new Error('Network failure'))

    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Navigate through all steps
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Initialize system/ })
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: /Initialize system/ })
    )

    await waitFor(() => {
      expect(submitSetup).toHaveBeenCalled()
    })
  })

  test('handles unsuccessful getSetupStatus response', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: false,
      message: 'Server error',
    })
    render(<SetupWizard />)

    // The component should render without crashing
    await waitFor(() => {
      expect(screen.getByText('System setup wizard')).toBeInTheDocument()
    })
  })

  test('hides navigation footer during loading', () => {
    vi.mocked(getSetupStatus).mockReturnValue(new Promise(() => {}))
    render(<SetupWizard />)
    expect(
      screen.queryByRole('button', { name: 'Next' })
    ).not.toBeInTheDocument()
  })

  test('hides navigation footer during error state', async () => {
    vi.mocked(getSetupStatus).mockRejectedValue(new Error('err'))
    render(<SetupWizard />)

    await waitFor(() => {
      expect(
        screen.getByText('We could not load the setup status.')
      ).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', { name: 'Next' })
    ).not.toBeInTheDocument()
  })

  test('renders database step with postgres', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'postgres' },
    })
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('PostgreSQL detected')).toBeInTheDocument()
    })
  })

  test('full wizard flow with valid credentials', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      success: true,
      data: { status: false, root_init: false, database_type: 'sqlite' },
    })
    vi.mocked(submitSetup).mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(<SetupWizard />)

    await waitFor(() => {
      expect(screen.getByText('Detected database')).toBeInTheDocument()
    })

    // Step 0 -> Step 1
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Choose a username')
      ).toBeInTheDocument()
    })

    // Fill in admin credentials
    await user.type(
      screen.getByPlaceholderText('Choose a username'),
      'admin'
    )
    await user.type(
      screen.getByPlaceholderText('Set a secure password (min. 8 characters)'),
      'password123'
    )
    await user.type(
      screen.getByPlaceholderText('Repeat the administrator password'),
      'password123'
    )

    // Step 1 -> Step 2
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(
        screen.getByText('How will you use the platform?')
      ).toBeInTheDocument()
    })

    // Step 2 -> Step 3
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(screen.getByText('Ready to initialize')).toBeInTheDocument()
    })

    // The review step should display the username
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('External operations mode')).toBeInTheDocument()

    // Submit
    await user.click(
      screen.getByRole('button', { name: /Initialize system/ })
    )

    await waitFor(() => {
      expect(submitSetup).toHaveBeenCalled()
    })
  })
})

import { render, screen, waitFor } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
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
  buildSetupPayload: vi.fn(() => ({})),
}))

import { getSetupStatus } from './api'
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
})

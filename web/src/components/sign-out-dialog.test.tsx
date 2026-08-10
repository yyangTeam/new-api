import { render, screen } from '@/test/test-utils'

import { SignOutDialog } from './sign-out-dialog'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({
  logout: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/lib/auth-session', () => ({
  clearAuthenticatedClientState: vi.fn(),
}))

describe('SignOutDialog', () => {
  test('renders when open', () => {
    render(<SignOutDialog open={true} onOpenChange={vi.fn()} />)
    const signOutElements = screen.getAllByText('Sign out')
    expect(signOutElements.length).toBeGreaterThanOrEqual(1)
  })

  test('shows confirmation message', () => {
    render(<SignOutDialog open={true} onOpenChange={vi.fn()} />)
    expect(
      screen.getByText(
        'Are you sure you want to sign out? You will need to sign in again to access your account.'
      )
    ).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    render(<SignOutDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })
})

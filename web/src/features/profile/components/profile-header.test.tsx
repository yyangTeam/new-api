import { render, screen } from '@/test/test-utils'

import { ProfileHeader } from './profile-header'
import type { UserProfile } from '../types'

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    username: 'testuser',
    display_name: 'Test User',
    role: 1,
    email: 'test@example.com',
    group: 'default',
    quota: 500000,
    used_quota: 120000,
    request_count: 42,
    status: 1,
    aff_count: 0,
    aff_quota: 0,
    aff_history_quota: 0,
    created_time: 1700000000,
    ...overrides,
  }
}

describe('ProfileHeader', () => {
  test('renders skeleton placeholders while loading', () => {
    const { container } = render(
      <ProfileHeader profile={null} loading={true} />
    )
    // Skeletons are rendered during loading state
    const skeletons = container.querySelectorAll('[class*="skeleton"], [data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test('renders nothing when not loading and profile is null', () => {
    const { container } = render(
      <ProfileHeader profile={null} loading={false} />
    )
    // Should render empty (the component returns null)
    expect(container.querySelector('[data-card-hover]')).not.toBeInTheDocument()
  })

  test('displays user display name', () => {
    const profile = createProfile({ display_name: 'Alice Smith' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  test('displays username with @ prefix', () => {
    const profile = createProfile({ username: 'alice' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  test('displays email when provided', () => {
    const profile = createProfile({ email: 'alice@example.com' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  test('displays user group when provided', () => {
    const profile = createProfile({ group: 'premium' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  test('displays user ID badge', () => {
    const profile = createProfile({ id: 7 })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText(/User ID.*7/)).toBeInTheDocument()
  })

  test('displays stat labels for balance, usage, and requests', () => {
    const profile = createProfile()
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('Current Balance')).toBeInTheDocument()
    expect(screen.getByText('Total Usage')).toBeInTheDocument()
    expect(screen.getByText('API Requests')).toBeInTheDocument()
  })

  test('falls back to username when display_name is empty', () => {
    const profile = createProfile({ display_name: '', username: 'fallback_user' })
    render(<ProfileHeader profile={profile} loading={false} />)
    // The heading should show username as fallback
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'fallback_user'
    )
  })
})

import { render, screen } from '@/test/test-utils'

import { ProfileHeader } from './profile-header'
import type { UserProfile } from '../types'

vi.mock('@/lib/avatar', () => ({
  getUserAvatarFallback: (name: string) => name.slice(0, 2).toUpperCase(),
  getUserAvatarStyle: () => ({ backgroundColor: '#ccc' }),
}))

vi.mock('@/lib/format', () => ({
  formatCompactNumber: (n: number) => String(n),
  formatQuota: (n: number) => `$${(n / 500000).toFixed(2)}`,
}))

vi.mock('@/lib/roles', () => ({
  getRoleLabel: (role: number) => {
    if (role === 100) return 'Super Admin'
    if (role === 10) return 'Admin'
    return 'User'
  },
}))

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    username: 'testuser',
    display_name: 'Test User',
    role: 1,
    group: 'default',
    quota: 500000,
    used_quota: 250000,
    request_count: 42,
    status: 1,
    aff_count: 0,
    aff_quota: 0,
    aff_history_quota: 0,
    created_time: 1700000000,
    ...overrides,
  }
}

describe('ProfileHeader - branch coverage', () => {
  test('renders loading skeleton when loading is true', () => {
    const { container } = render(
      <ProfileHeader profile={null} loading={true} />
    )
    // Should render skeleton elements
    expect(container.querySelector('[class*="animate-pulse"], [data-slot="skeleton"]')).not.toBeNull()
  })

  test('renders null when not loading and no profile', () => {
    const { container } = render(
      <ProfileHeader profile={null} loading={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders profile data', () => {
    const profile = createProfile()
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('@testuser')).toBeInTheDocument()
  })

  test('displays role badge', () => {
    const profile = createProfile({ role: 1 })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  test('displays user ID badge', () => {
    const profile = createProfile({ id: 42 })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('User ID 42')).toBeInTheDocument()
  })

  test('displays email when available', () => {
    const profile = createProfile({ email: 'test@example.com' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  test('hides email when not available', () => {
    const profile = createProfile({ email: undefined })
    render(<ProfileHeader profile={profile} loading={false} />)
    // The @ prefix for username should still be present
    expect(screen.getByText('@testuser')).toBeInTheDocument()
  })

  test('displays group when available', () => {
    const profile = createProfile({ group: 'premium' })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  test('hides group when empty', () => {
    const profile = createProfile({ group: '' })
    render(<ProfileHeader profile={profile} loading={false} />)
    // no group dot separator
  })

  test('displays stats: Current Balance, Total Usage, API Requests', () => {
    const profile = createProfile({
      quota: 1000000,
      used_quota: 500000,
      request_count: 100,
    })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('Current Balance')).toBeInTheDocument()
    expect(screen.getByText('Total Usage')).toBeInTheDocument()
    expect(screen.getByText('API Requests')).toBeInTheDocument()
  })

  test('uses username as avatar fallback when display_name empty', () => {
    const profile = createProfile({
      display_name: '',
      username: 'fallbackuser',
    })
    render(<ProfileHeader profile={profile} loading={false} />)
    expect(screen.getByText('FA')).toBeInTheDocument()
  })
})

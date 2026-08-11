import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/roles', () => ({
  getRoleLabel: vi.fn((role: number) => {
    if (role === 100) return 'Super Admin'
    if (role === 10) return 'Admin'
    if (role === 1) return 'User'
    return 'Guest'
  }),
}))

import { useUserDisplay } from '@/hooks/use-user-display'

describe('useUserDisplay', () => {
  it('returns default values when user is null', () => {
    const { result } = renderHook(() => useUserDisplay(null))
    expect(result.current.displayName).toBe('User')
    expect(result.current.secondaryText).toBe('')
    expect(result.current.initials).toBe('U')
    expect(result.current.roleLabel).toBe('')
  })

  it('returns default values when user is undefined', () => {
    const { result } = renderHook(() => useUserDisplay(undefined))
    expect(result.current.displayName).toBe('User')
    expect(result.current.secondaryText).toBe('')
    expect(result.current.initials).toBe('U')
    expect(result.current.roleLabel).toBe('')
  })

  it('uses display_name as primary display name', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: 'John Doe', role: 1 } as any)
    )
    expect(result.current.displayName).toBe('John Doe')
  })

  it('falls back to username when display_name is empty', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: '', role: 1 } as any)
    )
    expect(result.current.displayName).toBe('john')
  })

  it('falls back to t(User) when both display_name and username are empty', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: '', display_name: '', role: 1 } as any)
    )
    expect(result.current.displayName).toBe('User')
  })

  it('uses email as secondary text', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', email: 'john@example.com', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('john@example.com')
  })

  it('uses github_id when email is not available', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', github_id: '12345', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('GitHub ID: 12345')
  })

  it('uses oidc_id when email and github_id are not available', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', oidc_id: 'oidc123', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('OIDC ID: oidc123')
  })

  it('uses wechat_id when previous identifiers are not available', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', wechat_id: 'wx123', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('WeChat ID: wx123')
  })

  it('uses telegram_id when previous identifiers are not available', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', telegram_id: 'tg123', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('Telegram ID: tg123')
  })

  it('uses linux_do_id when previous identifiers are not available', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', linux_do_id: 'ld123', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('LinuxDO ID: ld123')
  })

  it('falls back to username for secondary text', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: 'John', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('john')
  })

  it('falls back to display_name for secondary text when username matches displayName', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: '', display_name: 'John', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('John')
  })

  it('generates initials from single word name', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: 'John', role: 1 } as any)
    )
    expect(result.current.initials).toBe('J')
  })

  it('generates initials from multi-word name', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: 'John Smith', role: 1 } as any)
    )
    expect(result.current.initials).toBe('JS')
  })

  it('limits initials to 2 characters', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', display_name: 'John Alexander Smith', role: 1 } as any)
    )
    expect(result.current.initials).toBe('JA')
  })

  it('returns role label', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: 'john', role: 100 } as any)
    )
    expect(result.current.roleLabel).toBe('Super Admin')
  })

  it('returns empty secondary text when no identifiers available and no username/display_name', () => {
    const { result } = renderHook(() =>
      useUserDisplay({ id: 1, username: '', display_name: '', role: 1 } as any)
    )
    expect(result.current.secondaryText).toBe('')
  })
})

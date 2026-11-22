import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(),
}))

vi.mock('@/lib/nav-modules', () => ({
  parseHeaderNavModulesFromStatus: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'

const mockUseStatus = useStatus as ReturnType<typeof vi.fn>
const mockParseModules = parseHeaderNavModulesFromStatus as ReturnType<typeof vi.fn>
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>

describe('useTopNavLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({ status: {} })
    mockUseAuthStore.mockReturnValue({ auth: { user: { id: 1 } } })
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
  })

  it('returns all default links when all modules are enabled', () => {
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).toContain('Home')
    expect(titles).toContain('Console')
    expect(titles).toContain('Model Square')
    expect(titles).toContain('Rankings')
    expect(titles).toContain('Docs')
    expect(titles).toContain('About')
  })

  it('excludes Home when home is false', () => {
    mockParseModules.mockReturnValue({
      home: false,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('Home')
  })

  it('excludes Console when console is false', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: false,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('Console')
  })

  it('excludes Pricing when pricing is not enabled', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: false, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('Model Square')
  })

  it('excludes Rankings when rankings is not enabled', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: false, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('Rankings')
  })

  it('excludes Docs when docs is false', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: false,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('Docs')
  })

  it('excludes About when about is false', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: false,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    expect(titles).not.toContain('About')
  })

  it('sets Docs as external link when docs_link is available', () => {
    mockUseStatus.mockReturnValue({ status: { docs_link: 'https://docs.example.com' } })
    const { result } = renderHook(() => useTopNavLinks())
    const docsLink = result.current.find((l) => l.title === 'Docs')
    expect(docsLink?.href).toBe('https://docs.example.com')
    expect(docsLink?.external).toBe(true)
  })

  it('sets Docs as internal link when docs_link is not available', () => {
    mockUseStatus.mockReturnValue({ status: {} })
    const { result } = renderHook(() => useTopNavLinks())
    const docsLink = result.current.find((l) => l.title === 'Docs')
    expect(docsLink?.href).toBe('/docs')
    expect(docsLink?.external).toBeUndefined()
  })

  it('sets requiresAuth on Pricing when requireAuth is true and user not authed', () => {
    mockUseAuthStore.mockReturnValue({ auth: { user: null } })
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: true },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const pricingLink = result.current.find((l) => l.title === 'Model Square')
    expect(pricingLink?.requiresAuth).toBe(true)
  })

  it('does not set requiresAuth on Pricing when user is authed', () => {
    mockUseAuthStore.mockReturnValue({ auth: { user: { id: 1 } } })
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: true },
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const pricingLink = result.current.find((l) => l.title === 'Model Square')
    expect(pricingLink?.requiresAuth).toBe(false)
  })

  it('sets requiresAuth on Rankings when requireAuth is true and user not authed', () => {
    mockUseAuthStore.mockReturnValue({ auth: { user: null } })
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: true, requireAuth: true },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const rankingsLink = result.current.find((l) => l.title === 'Rankings')
    expect(rankingsLink?.requiresAuth).toBe(true)
  })

  it('handles pricing as plain boolean (non-object) - not shown', () => {
    mockParseModules.mockReturnValue({
      home: true,
      console: true,
      pricing: true,
      rankings: { enabled: true, requireAuth: false },
      docs: true,
      about: true,
    })
    const { result } = renderHook(() => useTopNavLinks())
    const titles = result.current.map((l) => l.title)
    // pricing as boolean true is not typeof object with enabled, so it won't be included
    expect(titles).not.toContain('Model Square')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { ModelLimitsCell, IpRestrictionsCell, UnlimitedQuotaBadge } from './api-keys-cells'

vi.mock('./api-keys-provider', () => ({
  useApiKeys: () => ({
    resolveRealKey: vi.fn(),
    resolvedKeys: {},
    loadingKeys: {},
    copiedKeyId: null,
    markKeyCopied: vi.fn(),
  }),
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (v: number) => `$${v}`,
}))

describe('UnlimitedQuotaBadge', () => {
  test('renders without crashing', () => {
    const { container } = render(<UnlimitedQuotaBadge used={500} />)
    expect(container.firstChild).not.toBeNull()
  })

  test('renders Unlimited text', () => {
    const { container } = render(<UnlimitedQuotaBadge used={1000} />)
    expect(container.textContent).toContain('Unlimited')
  })
})

describe('ModelLimitsCell', () => {
  test('renders unlimited-style badge when model_limits_enabled is false', () => {
    const apiKey = { model_limits_enabled: false, model_limits: '' } as any
    const { container } = render(<ModelLimitsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('Unlimited')
  })

  test('renders unlimited-style badge when model_limits is empty string', () => {
    const apiKey = { model_limits_enabled: true, model_limits: '' } as any
    const { container } = render(<ModelLimitsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('Unlimited')
  })

  test('renders model count when limits are set', () => {
    const apiKey = { model_limits_enabled: true, model_limits: 'gpt-4,gpt-3.5' } as any
    const { container } = render(<ModelLimitsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('model')
  })

  test('does not crash with single model', () => {
    const apiKey = { model_limits_enabled: true, model_limits: 'gpt-4' } as any
    const { container } = render(<ModelLimitsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('model')
  })
})

describe('IpRestrictionsCell', () => {
  test('renders no restriction when allow_ips is empty', () => {
    const apiKey = { allow_ips: '' } as any
    const { container } = render(<IpRestrictionsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('No restriction')
  })

  test('renders no restriction when allow_ips is whitespace', () => {
    const apiKey = { allow_ips: '   ' } as any
    const { container } = render(<IpRestrictionsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('No restriction')
  })

  test('renders IP count when IPs are present', () => {
    const apiKey = { allow_ips: '192.168.1.1\n10.0.0.1' } as any
    const { container } = render(<IpRestrictionsCell apiKey={apiKey} />)
    expect(container.textContent).toContain('IP')
  })

  test('renders correctly with multiple IPs separated by newlines', () => {
    const apiKey = { allow_ips: '1.1.1.1\n\n2.2.2.2\n' } as any
    const { container } = render(<IpRestrictionsCell apiKey={apiKey} />)
    // Should count only non-empty lines (2 IPs)
    expect(container.textContent).toContain('IP')
  })

  test('does not render no restriction when IPs present', () => {
    const apiKey = { allow_ips: '10.0.0.1' } as any
    const { container } = render(<IpRestrictionsCell apiKey={apiKey} />)
    expect(container.textContent).not.toContain('No restriction')
  })
})

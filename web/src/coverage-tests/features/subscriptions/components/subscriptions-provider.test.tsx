import { describe, it, expect, vi } from 'vitest'
import { render, screen, renderHook } from '@testing-library/react'
import React from 'react'

vi.mock('@/features/system-settings/hooks/use-system-options', () => ({
  useSystemOptions: vi.fn(() => ({
    data: {
      data: [
        { key: 'payment_setting.compliance_confirmed', value: 'true' },
        { key: 'payment_setting.compliance_terms_version', value: 'v1' },
      ],
    },
  })),
  getOptionValue: vi.fn(
    (
      data: Array<{ key: string; value: string }> | undefined,
      defaults: Record<string, unknown>
    ) => {
      if (!data) return defaults
      const result = { ...defaults }
      for (const item of data) {
        if (item.key in defaults) {
          result[item.key] =
            item.value === 'true' ? true : item.value === 'false' ? false : item.value
        }
      }
      return result
    }
  ),
}))

vi.mock('@/hooks/use-dialog', () => ({
  default: vi.fn((initial) => {
    const [state, setState] = React.useState(initial)
    return [state, setState]
  }),
}))

import {
  SubscriptionsProvider,
  useSubscriptions,
} from '@/features/subscriptions/components/subscriptions-provider'

describe('SubscriptionsProvider', () => {
  it('renders children', () => {
    render(
      <SubscriptionsProvider>
        <div data-testid='child'>Hello</div>
      </SubscriptionsProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('provides context to children', () => {
    function Consumer() {
      const ctx = useSubscriptions()
      return <span data-testid='open'>{String(ctx.open)}</span>
    }
    render(
      <SubscriptionsProvider>
        <Consumer />
      </SubscriptionsProvider>
    )
    expect(screen.getByTestId('open').textContent).toBe('null')
  })

  it('provides complianceConfirmed=true when options match', () => {
    function Consumer() {
      const ctx = useSubscriptions()
      return (
        <span data-testid='compliance'>
          {String(ctx.complianceConfirmed)}
        </span>
      )
    }
    render(
      <SubscriptionsProvider>
        <Consumer />
      </SubscriptionsProvider>
    )
    expect(screen.getByTestId('compliance').textContent).toBe('true')
  })
})

describe('useSubscriptions', () => {
  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useSubscriptions())
    }).toThrow('useSubscriptions has to be used within <SubscriptionsProvider>')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  DEFAULT_QUOTA_WARNING_THRESHOLD,
  NOTIFICATION_METHODS,
  ADMIN_NOTIFICATION_METHODS,
} from '@/features/profile/constants'

describe('profile constants', () => {
  it('DEFAULT_QUOTA_WARNING_THRESHOLD is 500000', () => {
    expect(DEFAULT_QUOTA_WARNING_THRESHOLD).toBe(500000)
  })

  it('NOTIFICATION_METHODS has expected values', () => {
    expect(NOTIFICATION_METHODS).toHaveLength(4)
    const values = NOTIFICATION_METHODS.map((m) => m.value)
    expect(values).toContain('email')
    expect(values).toContain('webhook')
    expect(values).toContain('bark')
    expect(values).toContain('gotify')
  })

  it('NOTIFICATION_METHODS have labels', () => {
    for (const method of NOTIFICATION_METHODS) {
      expect(method.label).toBeTruthy()
    }
  })

  it('ADMIN_NOTIFICATION_METHODS has feishu and qqbot', () => {
    expect(ADMIN_NOTIFICATION_METHODS).toHaveLength(2)
    const values = ADMIN_NOTIFICATION_METHODS.map((m) => m.value)
    expect(values).toContain('feishu')
    expect(values).toContain('qqbot')
  })

  it('ADMIN_NOTIFICATION_METHODS have labels', () => {
    for (const method of ADMIN_NOTIFICATION_METHODS) {
      expect(method.label).toBeTruthy()
    }
  })
})

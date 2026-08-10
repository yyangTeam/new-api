import { describe, it, expect } from 'vitest'

import {
  formatDuration,
  formatResetPeriod,
  formatTimestamp,
  getPlanFormSchema,
  PLAN_FORM_DEFAULTS,
  planToFormValues,
  formValuesToPlanPayload,
} from './index'

describe('subscriptions/lib/index exports', () => {
  it('exports formatDuration', () => {
    expect(typeof formatDuration).toBe('function')
  })

  it('exports formatResetPeriod', () => {
    expect(typeof formatResetPeriod).toBe('function')
  })

  it('exports formatTimestamp', () => {
    expect(typeof formatTimestamp).toBe('function')
  })

  it('exports getPlanFormSchema', () => {
    expect(typeof getPlanFormSchema).toBe('function')
  })

  it('exports PLAN_FORM_DEFAULTS', () => {
    expect(PLAN_FORM_DEFAULTS).toBeDefined()
    expect(PLAN_FORM_DEFAULTS.title).toBe('')
  })

  it('exports planToFormValues', () => {
    expect(typeof planToFormValues).toBe('function')
  })

  it('exports formValuesToPlanPayload', () => {
    expect(typeof formValuesToPlanPayload).toBe('function')
  })
})

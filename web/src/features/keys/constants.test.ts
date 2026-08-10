import { describe, test, expect } from 'vitest'

import {
  API_KEY_STATUS,
  API_KEY_STATUSES,
  API_KEY_STATUS_OPTIONS,
  DEFAULT_GROUP,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './constants'

describe('API_KEY_STATUS', () => {
  test('has expected values', () => {
    expect(API_KEY_STATUS.ENABLED).toBe(1)
    expect(API_KEY_STATUS.DISABLED).toBe(2)
    expect(API_KEY_STATUS.EXPIRED).toBe(3)
    expect(API_KEY_STATUS.EXHAUSTED).toBe(4)
  })
})

describe('API_KEY_STATUSES', () => {
  test('has config for each status', () => {
    expect(API_KEY_STATUSES[1].label).toBe('Enabled')
    expect(API_KEY_STATUSES[1].variant).toBe('success')
    expect(API_KEY_STATUSES[2].label).toBe('Disabled')
    expect(API_KEY_STATUSES[2].variant).toBe('neutral')
    expect(API_KEY_STATUSES[3].label).toBe('Expired')
    expect(API_KEY_STATUSES[3].variant).toBe('warning')
    expect(API_KEY_STATUSES[4].label).toBe('Exhausted')
    expect(API_KEY_STATUSES[4].variant).toBe('danger')
  })
})

describe('API_KEY_STATUS_OPTIONS', () => {
  test('produces options array from statuses', () => {
    expect(API_KEY_STATUS_OPTIONS).toHaveLength(4)
    expect(API_KEY_STATUS_OPTIONS[0]).toEqual({ label: 'Enabled', value: '1' })
    expect(API_KEY_STATUS_OPTIONS[1]).toEqual({ label: 'Disabled', value: '2' })
    expect(API_KEY_STATUS_OPTIONS[2]).toEqual({ label: 'Expired', value: '3' })
    expect(API_KEY_STATUS_OPTIONS[3]).toEqual({ label: 'Exhausted', value: '4' })
  })
})

describe('DEFAULT_GROUP', () => {
  test('is empty string', () => {
    expect(DEFAULT_GROUP).toBe('')
  })
})

describe('ERROR_MESSAGES', () => {
  test('has all expected keys', () => {
    expect(ERROR_MESSAGES.UNEXPECTED).toBeDefined()
    expect(ERROR_MESSAGES.LOAD_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.SEARCH_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.CREATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.UPDATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.DELETE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.BATCH_DELETE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.BATCH_CREATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.BATCH_UPDATE_FAILED).toBeDefined()
    expect(ERROR_MESSAGES.STATUS_UPDATE_FAILED).toBeDefined()
  })
})

describe('SUCCESS_MESSAGES', () => {
  test('has all expected keys', () => {
    expect(SUCCESS_MESSAGES.API_KEY_CREATED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEY_UPDATED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEY_DELETED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEY_ENABLED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEY_DISABLED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEYS_BATCH_CREATED).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEYS_BATCH_PARTIAL).toBeDefined()
    expect(SUCCESS_MESSAGES.API_KEYS_BATCH_UPDATED).toBeDefined()
  })
})

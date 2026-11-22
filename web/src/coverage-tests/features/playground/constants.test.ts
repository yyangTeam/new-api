import { describe, it, expect } from 'vitest'

import {
  MESSAGE_ROLES,
  MESSAGE_STATUS,
  API_ENDPOINTS,
  DEFAULT_GROUP,
  DEFAULT_CONFIG,
  DEFAULT_PARAMETER_ENABLED,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  MESSAGE_ACTION_BUTTON_STYLES,
  MESSAGE_ACTION_LABELS,
} from '@/features/playground/constants'

describe('playground constants', () => {
  describe('MESSAGE_ROLES', () => {
    it('has user, assistant, system', () => {
      expect(MESSAGE_ROLES.USER).toBe('user')
      expect(MESSAGE_ROLES.ASSISTANT).toBe('assistant')
      expect(MESSAGE_ROLES.SYSTEM).toBe('system')
    })
  })

  describe('MESSAGE_STATUS', () => {
    it('has all statuses', () => {
      expect(MESSAGE_STATUS.LOADING).toBe('loading')
      expect(MESSAGE_STATUS.STREAMING).toBe('streaming')
      expect(MESSAGE_STATUS.COMPLETE).toBe('complete')
      expect(MESSAGE_STATUS.ERROR).toBe('error')
    })
  })

  describe('API_ENDPOINTS', () => {
    it('has expected endpoints', () => {
      expect(API_ENDPOINTS.CHAT_COMPLETIONS).toBe('/pg/chat/completions')
      expect(API_ENDPOINTS.USER_MODELS).toBe('/api/user/models')
      expect(API_ENDPOINTS.USER_GROUPS).toBe('/api/user/self/groups')
    })
  })

  describe('DEFAULT_GROUP', () => {
    it('is "default"', () => {
      expect(DEFAULT_GROUP).toBe('default')
    })
  })

  describe('DEFAULT_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_CONFIG.model).toBe('gpt-4o')
      expect(DEFAULT_CONFIG.group).toBe('default')
      expect(DEFAULT_CONFIG.temperature).toBe(0.7)
      expect(DEFAULT_CONFIG.top_p).toBe(1)
      expect(DEFAULT_CONFIG.max_tokens).toBe(4096)
      expect(DEFAULT_CONFIG.frequency_penalty).toBe(0)
      expect(DEFAULT_CONFIG.presence_penalty).toBe(0)
      expect(DEFAULT_CONFIG.seed).toBeNull()
      expect(DEFAULT_CONFIG.stream).toBe(true)
    })
  })

  describe('DEFAULT_PARAMETER_ENABLED', () => {
    it('has correct defaults', () => {
      expect(DEFAULT_PARAMETER_ENABLED.temperature).toBe(true)
      expect(DEFAULT_PARAMETER_ENABLED.top_p).toBe(true)
      expect(DEFAULT_PARAMETER_ENABLED.max_tokens).toBe(false)
      expect(DEFAULT_PARAMETER_ENABLED.frequency_penalty).toBe(true)
      expect(DEFAULT_PARAMETER_ENABLED.presence_penalty).toBe(true)
      expect(DEFAULT_PARAMETER_ENABLED.seed).toBe(false)
    })
  })

  describe('STORAGE_KEYS', () => {
    it('has expected keys', () => {
      expect(STORAGE_KEYS.CONFIG).toBe('playground_config')
      expect(STORAGE_KEYS.MESSAGES).toBe('playground_messages')
      expect(STORAGE_KEYS.PARAMETER_ENABLED).toBe('playground_parameter_enabled')
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('has all error message constants', () => {
      expect(ERROR_MESSAGES.API_REQUEST_ERROR).toBe('Request error occurred')
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeTruthy()
      expect(ERROR_MESSAGES.PARSE_ERROR).toBeTruthy()
      expect(ERROR_MESSAGES.STREAM_START_ERROR).toBeTruthy()
      expect(ERROR_MESSAGES.CONNECTION_CLOSED).toBeTruthy()
      expect(ERROR_MESSAGES.INTERRUPTED).toBeTruthy()
    })
  })

  describe('MESSAGE_ACTION_BUTTON_STYLES', () => {
    it('has BASE, DELETE, ICON', () => {
      expect(MESSAGE_ACTION_BUTTON_STYLES.BASE).toContain('size-7')
      expect(MESSAGE_ACTION_BUTTON_STYLES.DELETE).toContain('destructive')
      expect(MESSAGE_ACTION_BUTTON_STYLES.ICON).toContain('size-4')
    })
  })

  describe('MESSAGE_ACTION_LABELS', () => {
    it('has all labels', () => {
      expect(MESSAGE_ACTION_LABELS.COPY).toBe('Copy')
      expect(MESSAGE_ACTION_LABELS.COPIED).toBe('Copied!')
      expect(MESSAGE_ACTION_LABELS.REGENERATE).toBe('Regenerate')
      expect(MESSAGE_ACTION_LABELS.SHOW_PREVIEW).toBe('Show preview')
      expect(MESSAGE_ACTION_LABELS.SHOW_SOURCE).toBe('Show source')
      expect(MESSAGE_ACTION_LABELS.EDIT).toBe('Edit')
      expect(MESSAGE_ACTION_LABELS.DELETE).toBe('Delete')
      expect(MESSAGE_ACTION_LABELS.NO_CONTENT).toBe('No content to copy')
      expect(MESSAGE_ACTION_LABELS.WAIT_GENERATION).toBeTruthy()
    })
  })
})

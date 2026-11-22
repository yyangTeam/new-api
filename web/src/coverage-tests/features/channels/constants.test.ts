import { describe, it, expect } from 'vitest'

import {
  CHANNEL_TYPE_NEW_API,
  CHANNEL_TYPES,
  CHANNEL_TYPE_OPTIONS,
  CHANNEL_STATUS,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUS_OPTIONS,
  CHANNEL_STATUS_CONFIG,
  MULTI_KEY_STATUS,
  MULTI_KEY_STATUS_LABELS,
  MULTI_KEY_STATUS_CONFIG,
  MULTI_KEY_MODES,
  ADD_MODE_OPTIONS,
  MULTI_KEY_FILTER_OPTIONS,
  MULTI_KEY_CONFIRM_MESSAGES,
  AUTO_BAN_OPTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULT_PAGE_SIZE,
  DEFAULT_CHANNEL_VALUES,
  CHANNELS_TABLE_PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
  BALANCE_THRESHOLDS,
  RESPONSE_TIME_THRESHOLDS,
  RESPONSE_TIME_CONFIG,
  FIELD_PLACEHOLDERS,
  FIELD_DESCRIPTIONS,
  MODEL_FETCHABLE_TYPES,
  TYPE_TO_KEY_PROMPT,
  CHANNEL_TYPE_WARNINGS,
} from '@/features/channels/constants'

describe('channels/constants', () => {
  describe('CHANNEL_TYPE_NEW_API', () => {
    it('equals 60', () => {
      expect(CHANNEL_TYPE_NEW_API).toBe(60)
    })
  })

  describe('CHANNEL_TYPES', () => {
    it('has entry for type 1 (OpenAI)', () => {
      expect(CHANNEL_TYPES[1]).toBe('OpenAI')
    })

    it('has entry for type 60 (New API)', () => {
      expect(CHANNEL_TYPES[60]).toBe('New API')
    })

    it('has entry for type 0 (Unknown)', () => {
      expect(CHANNEL_TYPES[0]).toBe('Unknown')
    })
  })

  describe('CHANNEL_TYPE_OPTIONS', () => {
    it('is a non-empty array', () => {
      expect(CHANNEL_TYPE_OPTIONS.length).toBeGreaterThan(0)
    })

    it('does not include type 0 (Unknown)', () => {
      expect(CHANNEL_TYPE_OPTIONS.find((o) => o.value === 0)).toBeUndefined()
    })

    it('includes OpenAI and Anthropic', () => {
      expect(CHANNEL_TYPE_OPTIONS.find((o) => o.value === 1)?.label).toBe('OpenAI')
      expect(CHANNEL_TYPE_OPTIONS.find((o) => o.value === 14)?.label).toBe('Anthropic')
    })

    it('has no duplicates', () => {
      const values = CHANNEL_TYPE_OPTIONS.map((o) => o.value)
      expect(new Set(values).size).toBe(values.length)
    })

    it('each option has value and label', () => {
      for (const option of CHANNEL_TYPE_OPTIONS) {
        expect(typeof option.value).toBe('number')
        expect(typeof option.label).toBe('string')
        expect(option.label.length).toBeGreaterThan(0)
      }
    })
  })

  describe('CHANNEL_STATUS', () => {
    it('has expected values', () => {
      expect(CHANNEL_STATUS.UNKNOWN).toBe(0)
      expect(CHANNEL_STATUS.ENABLED).toBe(1)
      expect(CHANNEL_STATUS.MANUAL_DISABLED).toBe(2)
      expect(CHANNEL_STATUS.AUTO_DISABLED).toBe(3)
    })
  })

  describe('CHANNEL_STATUS_LABELS', () => {
    it('maps all statuses', () => {
      expect(CHANNEL_STATUS_LABELS[0]).toBe('Unknown')
      expect(CHANNEL_STATUS_LABELS[1]).toBe('Enabled')
      expect(CHANNEL_STATUS_LABELS[2]).toBe('Disabled')
      expect(CHANNEL_STATUS_LABELS[3]).toBe('Auto Disabled')
    })
  })

  describe('CHANNEL_STATUS_OPTIONS', () => {
    it('has 3 options', () => {
      expect(CHANNEL_STATUS_OPTIONS).toHaveLength(3)
    })

    it('includes all, enabled, disabled', () => {
      const values = CHANNEL_STATUS_OPTIONS.map((o) => o.value)
      expect(values).toEqual(['all', 'enabled', 'disabled'])
    })
  })

  describe('CHANNEL_STATUS_CONFIG', () => {
    it('has variant and label for each status', () => {
      expect(CHANNEL_STATUS_CONFIG[0].variant).toBe('neutral')
      expect(CHANNEL_STATUS_CONFIG[1].variant).toBe('success')
      expect(CHANNEL_STATUS_CONFIG[2].variant).toBe('danger')
      expect(CHANNEL_STATUS_CONFIG[3].variant).toBe('warning')
    })
  })

  describe('MULTI_KEY_STATUS', () => {
    it('has expected values', () => {
      expect(MULTI_KEY_STATUS.ENABLED).toBe(1)
      expect(MULTI_KEY_STATUS.MANUAL_DISABLED).toBe(2)
      expect(MULTI_KEY_STATUS.AUTO_DISABLED).toBe(3)
    })
  })

  describe('MULTI_KEY_STATUS_LABELS', () => {
    it('maps statuses', () => {
      expect(MULTI_KEY_STATUS_LABELS[1]).toBe('Enabled')
      expect(MULTI_KEY_STATUS_LABELS[2]).toBe('Manual Disabled')
      expect(MULTI_KEY_STATUS_LABELS[3]).toBe('Auto Disabled')
    })
  })

  describe('MULTI_KEY_STATUS_CONFIG', () => {
    it('maps variants', () => {
      expect(MULTI_KEY_STATUS_CONFIG[1].variant).toBe('success')
      expect(MULTI_KEY_STATUS_CONFIG[2].variant).toBe('neutral')
      expect(MULTI_KEY_STATUS_CONFIG[3].variant).toBe('danger')
    })
  })

  describe('MULTI_KEY_MODES', () => {
    it('has random and polling', () => {
      expect(MULTI_KEY_MODES).toHaveLength(2)
      expect(MULTI_KEY_MODES[0].value).toBe('random')
      expect(MULTI_KEY_MODES[1].value).toBe('polling')
    })
  })

  describe('ADD_MODE_OPTIONS', () => {
    it('has three modes', () => {
      expect(ADD_MODE_OPTIONS).toHaveLength(3)
      expect(ADD_MODE_OPTIONS.map((o) => o.value)).toEqual([
        'single',
        'batch',
        'multi_to_single',
      ])
    })
  })

  describe('MULTI_KEY_FILTER_OPTIONS', () => {
    it('has filter options', () => {
      expect(MULTI_KEY_FILTER_OPTIONS.length).toBe(4)
      expect(MULTI_KEY_FILTER_OPTIONS[0].value).toBe('all')
    })
  })

  describe('MULTI_KEY_CONFIRM_MESSAGES', () => {
    it('has all message keys', () => {
      expect(MULTI_KEY_CONFIRM_MESSAGES.DELETE).toBeDefined()
      expect(MULTI_KEY_CONFIRM_MESSAGES.ENABLE).toBeDefined()
      expect(MULTI_KEY_CONFIRM_MESSAGES.DISABLE).toBeDefined()
      expect(MULTI_KEY_CONFIRM_MESSAGES.ENABLE_ALL).toBeDefined()
      expect(MULTI_KEY_CONFIRM_MESSAGES.DISABLE_ALL).toBeDefined()
      expect(MULTI_KEY_CONFIRM_MESSAGES.DELETE_DISABLED).toBeDefined()
    })
  })

  describe('AUTO_BAN_OPTIONS', () => {
    it('has enabled and disabled', () => {
      expect(AUTO_BAN_OPTIONS).toHaveLength(2)
      expect(AUTO_BAN_OPTIONS[0].value).toBe(1)
      expect(AUTO_BAN_OPTIONS[1].value).toBe(0)
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('has required field messages', () => {
      expect(ERROR_MESSAGES.REQUIRED_NAME).toBeDefined()
      expect(ERROR_MESSAGES.REQUIRED_TYPE).toBeDefined()
      expect(ERROR_MESSAGES.REQUIRED_KEY).toBeDefined()
      expect(ERROR_MESSAGES.REQUIRED_MODELS).toBeDefined()
      expect(ERROR_MESSAGES.REQUIRED_GROUP).toBeDefined()
    })

    it('has validation messages', () => {
      expect(ERROR_MESSAGES.INVALID_JSON).toBeDefined()
      expect(ERROR_MESSAGES.INVALID_MODEL_MAPPING).toBeDefined()
      expect(ERROR_MESSAGES.INVALID_PROXY).toBeDefined()
    })

    it('has operation messages', () => {
      expect(ERROR_MESSAGES.CREATE_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.UPDATE_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.DELETE_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.TEST_FAILED).toBeDefined()
    })
  })

  describe('SUCCESS_MESSAGES', () => {
    it('has operation messages', () => {
      expect(SUCCESS_MESSAGES.CREATED).toBeDefined()
      expect(SUCCESS_MESSAGES.UPDATED).toBeDefined()
      expect(SUCCESS_MESSAGES.DELETED).toBeDefined()
      expect(SUCCESS_MESSAGES.COPIED).toBeDefined()
    })
  })

  describe('DEFAULT_PAGE_SIZE', () => {
    it('equals 20', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(20)
    })
  })

  describe('DEFAULT_CHANNEL_VALUES', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_CHANNEL_VALUES.name).toBe('')
      expect(DEFAULT_CHANNEL_VALUES.type).toBe(0)
      expect(DEFAULT_CHANNEL_VALUES.status).toBe(CHANNEL_STATUS.ENABLED)
      expect(DEFAULT_CHANNEL_VALUES.group).toBe('default')
      expect(DEFAULT_CHANNEL_VALUES.auto_ban).toBe(1)
    })
  })

  describe('CHANNELS_TABLE_PAGE_SIZE_OPTIONS', () => {
    it('has expected sizes', () => {
      expect(CHANNELS_TABLE_PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100])
    })
  })

  describe('SORT_OPTIONS', () => {
    it('has priority as first option', () => {
      expect(SORT_OPTIONS[0].value).toBe('priority')
    })

    it('has all expected sort options', () => {
      const values = SORT_OPTIONS.map((o) => o.value)
      expect(values).toContain('id')
      expect(values).toContain('name')
      expect(values).toContain('balance')
      expect(values).toContain('response_time')
    })
  })

  describe('BALANCE_THRESHOLDS', () => {
    it('has ascending thresholds', () => {
      expect(BALANCE_THRESHOLDS.LOW).toBeLessThan(BALANCE_THRESHOLDS.MEDIUM)
      expect(BALANCE_THRESHOLDS.MEDIUM).toBeLessThan(BALANCE_THRESHOLDS.HIGH)
    })
  })

  describe('RESPONSE_TIME_THRESHOLDS', () => {
    it('has ascending thresholds', () => {
      expect(RESPONSE_TIME_THRESHOLDS.EXCELLENT).toBeLessThan(
        RESPONSE_TIME_THRESHOLDS.GOOD
      )
      expect(RESPONSE_TIME_THRESHOLDS.GOOD).toBeLessThan(
        RESPONSE_TIME_THRESHOLDS.FAIR
      )
      expect(RESPONSE_TIME_THRESHOLDS.FAIR).toBeLessThan(
        RESPONSE_TIME_THRESHOLDS.POOR
      )
    })
  })

  describe('RESPONSE_TIME_CONFIG', () => {
    it('has all variants', () => {
      expect(RESPONSE_TIME_CONFIG.EXCELLENT.variant).toBe('success')
      expect(RESPONSE_TIME_CONFIG.GOOD.variant).toBe('success')
      expect(RESPONSE_TIME_CONFIG.FAIR.variant).toBe('warning')
      expect(RESPONSE_TIME_CONFIG.POOR.variant).toBe('danger')
      expect(RESPONSE_TIME_CONFIG.UNKNOWN.variant).toBe('neutral')
    })
  })

  describe('FIELD_PLACEHOLDERS', () => {
    it('has all placeholders defined as non-empty strings', () => {
      for (const value of Object.values(FIELD_PLACEHOLDERS)) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      }
    })
  })

  describe('FIELD_DESCRIPTIONS', () => {
    it('has all descriptions defined as non-empty strings', () => {
      for (const value of Object.values(FIELD_DESCRIPTIONS)) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      }
    })
  })

  describe('MODEL_FETCHABLE_TYPES', () => {
    it('is a Set', () => {
      expect(MODEL_FETCHABLE_TYPES).toBeInstanceOf(Set)
    })

    it('includes OpenAI (1)', () => {
      expect(MODEL_FETCHABLE_TYPES.has(1)).toBe(true)
    })

    it('includes Ollama (4)', () => {
      expect(MODEL_FETCHABLE_TYPES.has(4)).toBe(true)
    })

    it('does not include Azure (3)', () => {
      expect(MODEL_FETCHABLE_TYPES.has(3)).toBe(false)
    })
  })

  describe('TYPE_TO_KEY_PROMPT', () => {
    it('has prompts for specific types', () => {
      expect(TYPE_TO_KEY_PROMPT[15]).toContain('APIKey|SecretKey')
      expect(TYPE_TO_KEY_PROMPT[33]).toContain('Ak|Sk|Region')
      expect(TYPE_TO_KEY_PROMPT[57]).toContain('Codex')
    })
  })

  describe('CHANNEL_TYPE_WARNINGS', () => {
    it('has warnings for specific types', () => {
      expect(CHANNEL_TYPE_WARNINGS[3]).toBeDefined()
      expect(CHANNEL_TYPE_WARNINGS[8]).toBeDefined()
      expect(CHANNEL_TYPE_WARNINGS[37]).toBeDefined()
    })
  })
})

import { describe, it, expect } from 'vitest'

import {
  DEFAULT_LOG_STATS,
  DEFAULT_LOGS_DATA,
  LOG_TYPE_ENUM,
  LOG_TYPE_ALL_VALUE,
  TIME_RANGE_PRESETS,
  LOG_TYPES,
  LOG_TYPE_FILTERS,
  MJ_TASK_TYPES,
  MJ_TASK_STATUS,
  MJ_SUBMIT_RESULT_CODES,
  TASK_ACTIONS,
  TASK_STATUS,
  TASK_PLATFORMS,
  MJ_TASK_TYPE_MAPPINGS,
  MJ_STATUS_MAPPINGS,
  MJ_SUBMIT_RESULT_MAPPINGS,
  TASK_ACTION_MAPPINGS,
  TASK_STATUS_MAPPINGS,
  TASK_PLATFORM_MAPPINGS,
  LOG_CATEGORY_LABELS,
  DISPLAYABLE_LOG_TYPES,
  TIMING_LOG_TYPES,
} from './constants'

describe('usage-logs/constants', () => {
  describe('DEFAULT_LOG_STATS', () => {
    it('has zero values', () => {
      expect(DEFAULT_LOG_STATS).toEqual({ quota: 0, rpm: 0, tpm: 0 })
    })
  })

  describe('DEFAULT_LOGS_DATA', () => {
    it('has empty items and zero total', () => {
      expect(DEFAULT_LOGS_DATA).toEqual({ items: [], total: 0 })
    })
  })

  describe('LOG_TYPE_ENUM', () => {
    it('has all expected types', () => {
      expect(LOG_TYPE_ENUM.UNKNOWN).toBe(0)
      expect(LOG_TYPE_ENUM.TOPUP).toBe(1)
      expect(LOG_TYPE_ENUM.CONSUME).toBe(2)
      expect(LOG_TYPE_ENUM.MANAGE).toBe(3)
      expect(LOG_TYPE_ENUM.SYSTEM).toBe(4)
      expect(LOG_TYPE_ENUM.ERROR).toBe(5)
      expect(LOG_TYPE_ENUM.REFUND).toBe(6)
      expect(LOG_TYPE_ENUM.LOGIN).toBe(7)
    })
  })

  describe('LOG_TYPE_ALL_VALUE', () => {
    it('is "0"', () => {
      expect(LOG_TYPE_ALL_VALUE).toBe('0')
    })
  })

  describe('TIME_RANGE_PRESETS', () => {
    it('has 4 presets', () => {
      expect(TIME_RANGE_PRESETS).toHaveLength(4)
    })

    it('has ascending days', () => {
      for (let i = 1; i < TIME_RANGE_PRESETS.length; i++) {
        expect(TIME_RANGE_PRESETS[i].days).toBeGreaterThan(
          TIME_RANGE_PRESETS[i - 1].days
        )
      }
    })

    it('each preset has days and label', () => {
      for (const preset of TIME_RANGE_PRESETS) {
        expect(preset.days).toBeGreaterThan(0)
        expect(preset.label.length).toBeGreaterThan(0)
      }
    })
  })

  describe('LOG_TYPES', () => {
    it('has 8 log types', () => {
      expect(LOG_TYPES).toHaveLength(8)
    })

    it('each has value, label, and color', () => {
      for (const logType of LOG_TYPES) {
        expect(typeof logType.value).toBe('number')
        expect(logType.label.length).toBeGreaterThan(0)
        expect(logType.color.length).toBeGreaterThan(0)
      }
    })
  })

  describe('LOG_TYPE_FILTERS', () => {
    it('starts with "All Types" with value "0"', () => {
      expect(LOG_TYPE_FILTERS[0]).toEqual({
        label: 'All Types',
        value: LOG_TYPE_ALL_VALUE,
      })
    })

    it('excludes Unknown (value 0) from specific filters', () => {
      const filterValues = LOG_TYPE_FILTERS.slice(1).map((f) => f.value)
      // value "0" only appears in the first "All Types" entry
      expect(filterValues).not.toContain('0')
    })

    it('has 8 total entries (All + 7 specific)', () => {
      expect(LOG_TYPE_FILTERS).toHaveLength(8)
    })
  })

  describe('MJ_TASK_TYPES', () => {
    it('has IMAGINE type', () => {
      expect(MJ_TASK_TYPES.IMAGINE).toBe('IMAGINE')
    })

    it('has all expected types', () => {
      expect(MJ_TASK_TYPES.UPSCALE).toBe('UPSCALE')
      expect(MJ_TASK_TYPES.VARIATION).toBe('VARIATION')
      expect(MJ_TASK_TYPES.BLEND).toBe('BLEND')
      expect(MJ_TASK_TYPES.DESCRIBE).toBe('DESCRIBE')
      expect(MJ_TASK_TYPES.INPAINT).toBe('INPAINT')
      expect(MJ_TASK_TYPES.SWAP_FACE).toBe('SWAP_FACE')
    })
  })

  describe('MJ_TASK_STATUS', () => {
    it('has all statuses', () => {
      expect(MJ_TASK_STATUS.NOT_START).toBe('NOT_START')
      expect(MJ_TASK_STATUS.SUBMITTED).toBe('SUBMITTED')
      expect(MJ_TASK_STATUS.IN_PROGRESS).toBe('IN_PROGRESS')
      expect(MJ_TASK_STATUS.SUCCESS).toBe('SUCCESS')
      expect(MJ_TASK_STATUS.FAILURE).toBe('FAILURE')
      expect(MJ_TASK_STATUS.MODAL).toBe('MODAL')
    })
  })

  describe('MJ_SUBMIT_RESULT_CODES', () => {
    it('has correct codes', () => {
      expect(MJ_SUBMIT_RESULT_CODES.NOT_SUBMITTED).toBe(0)
      expect(MJ_SUBMIT_RESULT_CODES.SUBMITTED).toBe(1)
      expect(MJ_SUBMIT_RESULT_CODES.WAITING).toBe(21)
      expect(MJ_SUBMIT_RESULT_CODES.DUPLICATE).toBe(22)
    })
  })

  describe('TASK_ACTIONS', () => {
    it('has music and lyrics (uppercase)', () => {
      expect(TASK_ACTIONS.MUSIC).toBe('MUSIC')
      expect(TASK_ACTIONS.LYRICS).toBe('LYRICS')
    })

    it('has video actions (camelCase)', () => {
      expect(TASK_ACTIONS.GENERATE).toBe('generate')
      expect(TASK_ACTIONS.TEXT_GENERATE).toBe('textGenerate')
      expect(TASK_ACTIONS.FIRST_TAIL_GENERATE).toBe('firstTailGenerate')
      expect(TASK_ACTIONS.REFERENCE_GENERATE).toBe('referenceGenerate')
      expect(TASK_ACTIONS.REMIX_GENERATE).toBe('remixGenerate')
    })
  })

  describe('TASK_STATUS', () => {
    it('has all statuses', () => {
      expect(TASK_STATUS.NOT_START).toBe('NOT_START')
      expect(TASK_STATUS.SUBMITTED).toBe('SUBMITTED')
      expect(TASK_STATUS.IN_PROGRESS).toBe('IN_PROGRESS')
      expect(TASK_STATUS.SUCCESS).toBe('SUCCESS')
      expect(TASK_STATUS.FAILURE).toBe('FAILURE')
      expect(TASK_STATUS.QUEUED).toBe('QUEUED')
      expect(TASK_STATUS.UNKNOWN).toBe('UNKNOWN')
    })
  })

  describe('TASK_PLATFORMS', () => {
    it('has all platforms', () => {
      expect(TASK_PLATFORMS.SUNO).toBe('suno')
      expect(TASK_PLATFORMS.KLING).toBe('kling')
      expect(TASK_PLATFORMS.RUNWAY).toBe('runway')
      expect(TASK_PLATFORMS.LUMA).toBe('luma')
      expect(TASK_PLATFORMS.VIGGLE).toBe('viggle')
    })
  })

  describe('MJ_TASK_TYPE_MAPPINGS', () => {
    it('maps IMAGINE', () => {
      expect(MJ_TASK_TYPE_MAPPINGS.IMAGINE).toEqual({
        label: 'Draw',
        variant: 'blue',
      })
    })

    it('maps all task types', () => {
      const types = Object.values(MJ_TASK_TYPES).filter((t) => t !== 'MODAL')
      for (const type of types) {
        expect(MJ_TASK_TYPE_MAPPINGS[type]).toBeDefined()
        expect(MJ_TASK_TYPE_MAPPINGS[type].label).toBeDefined()
        expect(MJ_TASK_TYPE_MAPPINGS[type].variant).toBeDefined()
      }
    })
  })

  describe('MJ_STATUS_MAPPINGS', () => {
    it('maps SUCCESS to green', () => {
      expect(MJ_STATUS_MAPPINGS.SUCCESS).toEqual({
        label: 'Success',
        variant: 'green',
      })
    })

    it('maps FAILURE to red', () => {
      expect(MJ_STATUS_MAPPINGS.FAILURE).toEqual({
        label: 'Failed',
        variant: 'red',
      })
    })

    it('maps all statuses', () => {
      for (const status of Object.values(MJ_TASK_STATUS)) {
        expect(MJ_STATUS_MAPPINGS[status]).toBeDefined()
      }
    })
  })

  describe('MJ_SUBMIT_RESULT_MAPPINGS', () => {
    it('maps all result codes', () => {
      expect(MJ_SUBMIT_RESULT_MAPPINGS['1'].label).toBe('Submitted')
      expect(MJ_SUBMIT_RESULT_MAPPINGS['21'].label).toBe('Waiting')
      expect(MJ_SUBMIT_RESULT_MAPPINGS['22'].label).toBe('Duplicate')
      expect(MJ_SUBMIT_RESULT_MAPPINGS['0'].label).toBe('Not Submitted')
    })
  })

  describe('TASK_ACTION_MAPPINGS', () => {
    it('maps MUSIC', () => {
      expect(TASK_ACTION_MAPPINGS.MUSIC.label).toBe('Generate Music')
    })

    it('maps generate actions', () => {
      expect(TASK_ACTION_MAPPINGS.generate.label).toBe('Image to Video')
      expect(TASK_ACTION_MAPPINGS.textGenerate.label).toBe('Text to Video')
    })
  })

  describe('TASK_STATUS_MAPPINGS', () => {
    it('maps SUCCESS to green', () => {
      expect(TASK_STATUS_MAPPINGS.SUCCESS.variant).toBe('green')
    })

    it('maps FAILURE to red', () => {
      expect(TASK_STATUS_MAPPINGS.FAILURE.variant).toBe('red')
    })

    it('maps all statuses', () => {
      for (const status of Object.values(TASK_STATUS)) {
        expect(TASK_STATUS_MAPPINGS[status]).toBeDefined()
      }
    })
  })

  describe('TASK_PLATFORM_MAPPINGS', () => {
    it('maps all platforms', () => {
      for (const platform of Object.values(TASK_PLATFORMS)) {
        expect(TASK_PLATFORM_MAPPINGS[platform]).toBeDefined()
        expect(TASK_PLATFORM_MAPPINGS[platform].label).toBe(platform)
      }
    })
  })

  describe('LOG_CATEGORY_LABELS', () => {
    it('has all categories', () => {
      expect(LOG_CATEGORY_LABELS.common).toBe('Common')
      expect(LOG_CATEGORY_LABELS.drawing).toBe('Drawing')
      expect(LOG_CATEGORY_LABELS.task).toBe('Task')
    })
  })

  describe('DISPLAYABLE_LOG_TYPES', () => {
    it('includes types 0, 2, 5, 6', () => {
      expect(DISPLAYABLE_LOG_TYPES).toEqual([0, 2, 5, 6])
    })
  })

  describe('TIMING_LOG_TYPES', () => {
    it('includes types 2, 5', () => {
      expect(TIMING_LOG_TYPES).toEqual([2, 5])
    })
  })
})

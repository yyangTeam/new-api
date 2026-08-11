import { describe, it, expect } from 'vitest'

import {
  DEFAULT_ENDPOINT,
  OFFICIAL_CHANNEL_ID,
  OFFICIAL_CHANNEL_NAME,
  OFFICIAL_CHANNEL_BASE_URL,
  OFFICIAL_CHANNEL_ENDPOINT,
  MODELS_DEV_PRESET_ID,
  MODELS_DEV_PRESET_NAME,
  MODELS_DEV_PRESET_BASE_URL,
  MODELS_DEV_PRESET_ENDPOINT,
  OPENROUTER_ENDPOINT,
  OPENROUTER_CHANNEL_TYPE,
  ENDPOINT_OPTIONS,
  RATIO_TYPE_OPTIONS,
  CHANNEL_STATUS_CONFIG,
} from '@/features/system-settings/models/constants'

describe('models/constants', () => {
  describe('DEFAULT_ENDPOINT', () => {
    it('is /api/pricing', () => {
      expect(DEFAULT_ENDPOINT).toBe('/api/pricing')
    })
  })

  describe('official channel constants', () => {
    it('has negative ID -100', () => {
      expect(OFFICIAL_CHANNEL_ID).toBe(-100)
    })

    it('has expected name', () => {
      expect(OFFICIAL_CHANNEL_NAME).toBe('官方倍率预设')
    })

    it('has expected base URL', () => {
      expect(OFFICIAL_CHANNEL_BASE_URL).toBe('https://basellm.github.io')
    })

    it('has expected endpoint', () => {
      expect(OFFICIAL_CHANNEL_ENDPOINT).toBe(
        '/llm-metadata/api/newapi/ratio_config-v1-base.json'
      )
    })
  })

  describe('models.dev preset constants', () => {
    it('has negative ID -101', () => {
      expect(MODELS_DEV_PRESET_ID).toBe(-101)
    })

    it('has expected name', () => {
      expect(MODELS_DEV_PRESET_NAME).toBe('models.dev 价格预设')
    })

    it('has expected base URL', () => {
      expect(MODELS_DEV_PRESET_BASE_URL).toBe('https://models.dev')
    })

    it('has expected endpoint', () => {
      expect(MODELS_DEV_PRESET_ENDPOINT).toBe('https://models.dev/api.json')
    })
  })

  describe('OpenRouter constants', () => {
    it('has endpoint value "openrouter"', () => {
      expect(OPENROUTER_ENDPOINT).toBe('openrouter')
    })

    it('has channel type 20', () => {
      expect(OPENROUTER_CHANNEL_TYPE).toBe(20)
    })
  })

  describe('ENDPOINT_OPTIONS', () => {
    it('has 4 options', () => {
      expect(ENDPOINT_OPTIONS).toHaveLength(4)
    })

    it('includes pricing, ratio_config, OpenRouter, and custom', () => {
      const values = ENDPOINT_OPTIONS.map((o) => o.value)
      expect(values).toContain('/api/pricing')
      expect(values).toContain('/api/ratio_config')
      expect(values).toContain('openrouter')
      expect(values).toContain('custom')
    })
  })

  describe('RATIO_TYPE_OPTIONS', () => {
    it('has 9 options', () => {
      expect(RATIO_TYPE_OPTIONS).toHaveLength(9)
    })

    it('includes all ratio types', () => {
      const values = RATIO_TYPE_OPTIONS.map((o) => o.value)
      expect(values).toContain('model_ratio')
      expect(values).toContain('completion_ratio')
      expect(values).toContain('cache_ratio')
      expect(values).toContain('create_cache_ratio')
      expect(values).toContain('image_ratio')
      expect(values).toContain('audio_ratio')
      expect(values).toContain('audio_completion_ratio')
      expect(values).toContain('model_price')
      expect(values).toContain('billing_expr')
    })
  })

  describe('CHANNEL_STATUS_CONFIG', () => {
    it('has config for status 1 (Enabled)', () => {
      expect(CHANNEL_STATUS_CONFIG[1]).toEqual({
        label: 'Enabled',
        variant: 'success',
      })
    })

    it('has config for status 2 (Disabled)', () => {
      expect(CHANNEL_STATUS_CONFIG[2]).toEqual({
        label: 'Disabled',
        variant: 'danger',
      })
    })

    it('has config for status 3 (Auto Disabled)', () => {
      expect(CHANNEL_STATUS_CONFIG[3]).toEqual({
        label: 'Auto Disabled',
        variant: 'warning',
      })
    })
  })
})

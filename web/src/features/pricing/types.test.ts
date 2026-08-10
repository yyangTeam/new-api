import { describe, test, expect } from 'vitest'

import type { PricingModel, PricingData, PricingVendor, TokenUnit, PriceType, QuotaType, Modality, ModelCapability } from './types'

describe('PricingModel type', () => {
  test('model can be constructed with required fields', () => {
    const model: PricingModel = {
      id: 1,
      model_name: 'gpt-4',
      quota_type: 0,
      model_ratio: 30,
      completion_ratio: 2,
      enable_groups: ['default'],
    }
    expect(model.model_name).toBe('gpt-4')
    expect(model.quota_type).toBe(0)
  })

  test('model can have all optional fields', () => {
    const model: PricingModel = {
      id: 1,
      model_name: 'claude-3',
      quota_type: 1,
      model_ratio: 15,
      completion_ratio: 1.5,
      enable_groups: ['vip'],
      description: 'Test',
      icon: '/icon.png',
      vendor_id: 2,
      vendor_name: 'Anthropic',
      vendor_icon: '/vendor.png',
      model_price: 0.01,
      cache_ratio: 0.5,
      create_cache_ratio: 0.3,
      image_ratio: 2,
      audio_ratio: 1.5,
      audio_completion_ratio: 1.2,
      tags: 'chat,reasoning',
      supported_endpoint_types: ['chat', 'embeddings'],
      key: 'claude-3',
      group_ratio: { default: 1, vip: 0.8 },
      billing_mode: 'tiered_expr',
      billing_expr: 'input * 0.01',
      pricing_version: 'v2',
      context_length: 200000,
      max_output_tokens: 4096,
      knowledge_cutoff: '2024-04',
      release_date: '2024-03-14',
      parameter_count: '175B',
      input_modalities: ['text', 'image'],
      output_modalities: ['text'],
      capabilities: ['function_calling', 'streaming', 'vision'],
    }
    expect(model.billing_mode).toBe('tiered_expr')
    expect(model.capabilities).toContain('vision')
  })
})

describe('PricingData type', () => {
  test('can be constructed', () => {
    const data: PricingData = {
      success: true,
      data: [],
      vendors: [],
      group_ratio: {},
      usable_group: {},
      supported_endpoint: {},
      auto_groups: [],
    }
    expect(data.success).toBe(true)
  })
})

describe('PricingVendor type', () => {
  test('can be constructed', () => {
    const vendor: PricingVendor = { id: 1, name: 'OpenAI' }
    expect(vendor.name).toBe('OpenAI')
  })
})

describe('TokenUnit type', () => {
  test('accepts M and K', () => {
    const m: TokenUnit = 'M'
    const k: TokenUnit = 'K'
    expect(m).toBe('M')
    expect(k).toBe('K')
  })
})

describe('PriceType type', () => {
  test('accepts valid price types', () => {
    const types: PriceType[] = ['input', 'output', 'cache', 'create_cache', 'image', 'audio_input', 'audio_output']
    expect(types).toHaveLength(7)
  })
})

describe('QuotaType type', () => {
  test('accepts 0 and 1', () => {
    const token: QuotaType = 0
    const request: QuotaType = 1
    expect(token).toBe(0)
    expect(request).toBe(1)
  })
})

describe('Modality type', () => {
  test('covers all modalities', () => {
    const mods: Modality[] = ['text', 'image', 'audio', 'video', 'file']
    expect(mods).toHaveLength(5)
  })
})

describe('ModelCapability type', () => {
  test('covers all capabilities', () => {
    const caps: ModelCapability[] = [
      'function_calling', 'streaming', 'vision', 'json_mode',
      'structured_output', 'reasoning', 'tools', 'system_prompt',
      'web_search', 'code_interpreter', 'caching', 'embeddings',
    ]
    expect(caps).toHaveLength(12)
  })
})

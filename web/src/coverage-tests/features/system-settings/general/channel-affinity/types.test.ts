import { describe, it, expect } from 'vitest'

import type {
  KeySource,
  AffinityRule,
  CacheStats,
  ChannelAffinitySettings,
} from '@/features/system-settings/general/channel-affinity/types'

describe('channel-affinity types', () => {
  it('KeySource type supports context_int', () => {
    const ks: KeySource = { type: 'context_int', key: 'user_id' }
    expect(ks.type).toBe('context_int')
    expect(ks.key).toBe('user_id')
  })

  it('KeySource type supports context_string', () => {
    const ks: KeySource = { type: 'context_string', key: 'session' }
    expect(ks.type).toBe('context_string')
  })

  it('KeySource type supports request_header', () => {
    const ks: KeySource = { type: 'request_header', key: 'X-Custom' }
    expect(ks.type).toBe('request_header')
  })

  it('KeySource type supports gjson with path', () => {
    const ks: KeySource = { type: 'gjson', path: 'body.model' }
    expect(ks.type).toBe('gjson')
    expect(ks.path).toBe('body.model')
  })

  it('AffinityRule type has expected shape', () => {
    const rule: AffinityRule = {
      name: 'sticky-session',
      model_regex: ['gpt-4.*'],
      path_regex: ['/v1/chat/completions'],
      key_sources: [{ type: 'context_int', key: 'user_id' }],
      ttl_seconds: 3600,
      skip_retry_on_failure: false,
      include_using_group: true,
      include_model_name: true,
      include_rule_name: false,
    }
    expect(rule.name).toBe('sticky-session')
    expect(rule.model_regex).toHaveLength(1)
    expect(rule.ttl_seconds).toBe(3600)
  })

  it('AffinityRule supports optional fields', () => {
    const rule: AffinityRule = {
      id: 5,
      name: 'test',
      model_regex: [],
      path_regex: [],
      user_agent_include: ['bot/*'],
      key_sources: [],
      value_regex: '^abc',
      ttl_seconds: 60,
      skip_retry_on_failure: true,
      include_using_group: false,
      include_model_name: false,
      include_rule_name: true,
      param_override_template: { temperature: 0.5 },
    }
    expect(rule.id).toBe(5)
    expect(rule.user_agent_include).toEqual(['bot/*'])
    expect(rule.param_override_template).toEqual({ temperature: 0.5 })
  })

  it('CacheStats type has expected shape', () => {
    const stats: CacheStats = {
      enabled: true,
      total: 100,
      unknown: 5,
      by_rule_name: { rule1: 50, rule2: 45 },
      cache_capacity: 10000,
      cache_algo: 'lru',
    }
    expect(stats.total).toBe(100)
    expect(stats.by_rule_name.rule1).toBe(50)
  })

  it('ChannelAffinitySettings type has expected shape', () => {
    const settings: ChannelAffinitySettings = {
      'channel_affinity_setting.enabled': true,
      'channel_affinity_setting.switch_on_success': true,
      'channel_affinity_setting.keep_on_channel_disabled': false,
      'channel_affinity_setting.max_entries': 100000,
      'channel_affinity_setting.default_ttl_seconds': 3600,
      'channel_affinity_setting.rules': '[]',
    }
    expect(settings['channel_affinity_setting.enabled']).toBe(true)
    expect(settings['channel_affinity_setting.max_entries']).toBe(100000)
  })
})

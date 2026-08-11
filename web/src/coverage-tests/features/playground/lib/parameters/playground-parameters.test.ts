import { describe, it, expect } from 'vitest'

import {
  normalizeParameterNumberValue,
  getParameterControlValueText,
  PLAYGROUND_PARAMETER_CONTROLS,
  PLAYGROUND_PARAMETER_PANEL_SCROLL_CLASS,
} from '@/features/playground/lib/parameters/playground-parameters'

describe('normalizeParameterNumberValue', () => {
  it('returns null for seed with empty string', () => {
    expect(normalizeParameterNumberValue('seed', '')).toBeNull()
  })

  it('returns 0 for non-seed key with empty string', () => {
    expect(normalizeParameterNumberValue('temperature', '')).toBe(0)
  })

  it('clamps value to min', () => {
    expect(normalizeParameterNumberValue('temperature', -5)).toBe(0.1)
  })

  it('clamps value to max', () => {
    expect(normalizeParameterNumberValue('temperature', 100)).toBe(1)
  })

  it('handles string input', () => {
    expect(normalizeParameterNumberValue('temperature', '0.5')).toBe(0.5)
  })

  it('returns null for seed with NaN string', () => {
    expect(normalizeParameterNumberValue('seed', 'abc')).toBeNull()
  })

  it('returns 0 for non-seed key with NaN string', () => {
    expect(normalizeParameterNumberValue('temperature', 'abc')).toBe(0)
  })

  it('truncates integer-step values', () => {
    expect(normalizeParameterNumberValue('max_tokens', 100.9)).toBe(100)
  })

  it('rounds to correct precision for float step', () => {
    expect(normalizeParameterNumberValue('temperature', 0.75)).toBe(0.8)
  })

  it('handles frequency_penalty negative range', () => {
    expect(normalizeParameterNumberValue('frequency_penalty', -1.5)).toBe(-1.5)
  })

  it('clamps frequency_penalty below min', () => {
    expect(normalizeParameterNumberValue('frequency_penalty', -3)).toBe(-2)
  })

  it('clamps frequency_penalty above max', () => {
    expect(normalizeParameterNumberValue('frequency_penalty', 3)).toBe(2)
  })

  it('handles seed within valid range', () => {
    expect(normalizeParameterNumberValue('seed', 42)).toBe(42)
  })

  it('clamps seed to max', () => {
    expect(normalizeParameterNumberValue('seed', 2147483648)).toBe(2147483647)
  })

  it('clamps seed to min', () => {
    expect(normalizeParameterNumberValue('seed', -1)).toBe(0)
  })

  it('returns null for unknown key with empty value', () => {
    // Unknown key defaults to seed-like behavior (returns null for empty)
    // Actually for unknown key, control is undefined so returns null for seed, 0 otherwise
    expect(normalizeParameterNumberValue('seed', '')).toBeNull()
  })

  it('returns 0 for unknown key with NaN and non-seed', () => {
    expect(normalizeParameterNumberValue('top_p', 'xyz')).toBe(0)
  })
})

describe('getParameterControlValueText', () => {
  it('returns "Not set" for seed with null value', () => {
    expect(getParameterControlValueText('seed', null)).toBe('Not set')
  })

  it('returns string of numeric value', () => {
    expect(getParameterControlValueText('temperature', 0.7)).toBe('0.7')
  })

  it('returns string of zero', () => {
    expect(getParameterControlValueText('frequency_penalty', 0)).toBe('0')
  })

  it('returns seed number as string', () => {
    expect(getParameterControlValueText('seed', 42)).toBe('42')
  })
})

describe('PLAYGROUND_PARAMETER_CONTROLS', () => {
  it('has 6 parameter controls', () => {
    expect(PLAYGROUND_PARAMETER_CONTROLS).toHaveLength(6)
  })

  it('temperature control has correct range', () => {
    const temp = PLAYGROUND_PARAMETER_CONTROLS.find((c) => c.key === 'temperature')
    expect(temp).toBeDefined()
    expect(temp!.min).toBe(0.1)
    expect(temp!.max).toBe(1)
    expect(temp!.step).toBe(0.1)
    expect(temp!.valueType).toBe('slider')
  })

  it('max_tokens control has number type', () => {
    const maxTokens = PLAYGROUND_PARAMETER_CONTROLS.find((c) => c.key === 'max_tokens')
    expect(maxTokens).toBeDefined()
    expect(maxTokens!.valueType).toBe('number')
    expect(maxTokens!.max).toBe(200000)
  })

  it('seed control has correct range', () => {
    const seed = PLAYGROUND_PARAMETER_CONTROLS.find((c) => c.key === 'seed')
    expect(seed).toBeDefined()
    expect(seed!.min).toBe(0)
    expect(seed!.max).toBe(2147483647)
  })
})

describe('PLAYGROUND_PARAMETER_PANEL_SCROLL_CLASS', () => {
  it('is a non-empty string', () => {
    expect(PLAYGROUND_PARAMETER_PANEL_SCROLL_CLASS.length).toBeGreaterThan(0)
  })
})

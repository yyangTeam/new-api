import { describe, it, expect } from 'vitest'

import dayjs from './dayjs'

describe('dayjs', () => {
  it('exports a dayjs function', () => {
    expect(typeof dayjs).toBe('function')
  })

  it('creates a valid dayjs instance', () => {
    const d = dayjs('2024-01-01')
    expect(d.isValid()).toBe(true)
  })

  it('has relativeTime plugin loaded (fromNow)', () => {
    const d = dayjs('2020-01-01')
    expect(typeof d.fromNow).toBe('function')
    const result = d.fromNow()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('has relativeTime plugin loaded (toNow)', () => {
    const d = dayjs('2020-01-01')
    expect(typeof d.toNow).toBe('function')
  })

  it('formats dates correctly', () => {
    const d = dayjs('2024-06-15')
    expect(d.format('YYYY-MM-DD')).toBe('2024-06-15')
  })
})

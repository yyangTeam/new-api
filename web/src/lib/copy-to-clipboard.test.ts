import { describe, it, expect, vi, beforeEach } from 'vitest'

import { copyToClipboard } from './copy-to-clipboard'

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when navigator.clipboard.writeText succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to execCommand when clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) },
      writable: true,
      configurable: true,
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    document.execCommand = vi.fn().mockReturnValue(true)

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('uses fallback when navigator.clipboard is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(true)

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('uses fallback when clipboard.writeText is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {},
      writable: true,
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(true)

    const result = await copyToClipboard('hello')
    expect(result).toBe(true)
  })

  it('returns false when fallback execCommand returns false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(false)

    const result = await copyToClipboard('hello')
    expect(result).toBe(false)
  })

  it('returns false when fallback throws an error', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await copyToClipboard('hello')
    expect(result).toBe(false)
  })

  it('handles the normal execution path', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })

    const result = await copyToClipboard('hello')
    expect(typeof result).toBe('boolean')
  })

  it('creates textarea in fallback method and removes it after', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    document.execCommand = vi.fn().mockReturnValue(true)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    await copyToClipboard('test text')

    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })
})

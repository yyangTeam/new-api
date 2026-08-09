import { describe, it, expect, vi, beforeEach } from 'vitest'

import { applyFaviconToDom } from './dom-utils'

describe('applyFaviconToDom', () => {
  beforeEach(() => {
    // Clear existing link elements
    document.querySelectorAll('link[rel~="icon"]').forEach((el) => el.remove())
  })

  it('creates a new favicon link element', () => {
    applyFaviconToDom('/favicon.ico')
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link).not.toBeNull()
    expect(link!.href).toContain('/favicon.ico')
  })

  it('does nothing when url is empty string', () => {
    applyFaviconToDom('')
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link).toBeNull()
  })

  it('replaces existing favicon link elements', () => {
    const existing = document.createElement('link')
    existing.rel = 'icon'
    existing.href = '/old-icon.png'
    document.head.appendChild(existing)

    applyFaviconToDom('/new-icon.png')

    const links = document.querySelectorAll('link[rel~="icon"]')
    expect(links).toHaveLength(1)
    expect((links[0] as HTMLLinkElement).href).toContain('/new-icon.png')
  })

  it('does not recreate link if href is already set to the same value', () => {
    const existing = document.createElement('link')
    existing.rel = 'icon'
    existing.href = new URL('/favicon.ico', window.location.href).href
    document.head.appendChild(existing)

    const appendSpy = vi.spyOn(document.head, 'appendChild')
    applyFaviconToDom('/favicon.ico')

    expect(appendSpy).not.toHaveBeenCalled()
    appendSpy.mockRestore()
  })

  it('handles relative URLs by resolving against window.location', () => {
    applyFaviconToDom('/assets/icon.png')
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link!.href).toContain('/assets/icon.png')
  })

  it('handles absolute URLs', () => {
    applyFaviconToDom('https://cdn.example.com/icon.png')
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link!.href).toBe('https://cdn.example.com/icon.png')
  })

  it('removes multiple existing icons', () => {
    const icon1 = document.createElement('link')
    icon1.rel = 'icon'
    icon1.href = '/icon1.png'
    document.head.appendChild(icon1)

    const icon2 = document.createElement('link')
    icon2.rel = 'icon'
    icon2.href = '/icon2.png'
    document.head.appendChild(icon2)

    applyFaviconToDom('/new.png')

    const links = document.querySelectorAll('link[rel~="icon"]')
    expect(links).toHaveLength(1)
    expect((links[0] as HTMLLinkElement).href).toContain('/new.png')
  })
})

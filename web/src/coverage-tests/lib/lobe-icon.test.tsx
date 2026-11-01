import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// The renderer no longer imports icon components from the @lobehub/icons main
// entry. It reads the registry from @lobehub/icons/es/toc and lazy-loads the
// selected SVG variant from @lobehub/icons/es/<id>/components/<variant>.js.
// Mock those exact modules plus the custom asset imports the renderer pulls in
// at module load time.
vi.mock('@lobehub/icons/es/toc', () => ({
  toc: [
    {
      id: 'OpenAI',
      param: {
        hasAvatar: true,
        hasBrand: false,
        hasBrandColor: false,
        // hasColor is false in the real registry, but the test exercises the
        // Color variant branch, so flag it here as a controlled fixture.
        hasColor: true,
        hasCombine: false,
        hasText: false,
        hasTextCn: false,
        hasTextColor: false,
      },
    },
    {
      id: 'Claude',
      param: {
        hasAvatar: false,
        hasBrand: false,
        hasBrandColor: false,
        hasColor: false,
        hasCombine: false,
        hasText: false,
        hasTextCn: false,
        hasTextColor: false,
      },
    },
  ],
}))

vi.mock('@lobehub/icons/es/OpenAI/components/Mono.js', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid='openai' {...props} />
  ),
}))
vi.mock('@lobehub/icons/es/OpenAI/components/Color.js', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid='openai-color' {...props} />
  ),
}))
vi.mock('@lobehub/icons/es/OpenAI/components/Avatar.js', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid='openai-avatar' {...props} />
  ),
}))
vi.mock('@lobehub/icons/es/Claude/components/Mono.js', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid='claude' {...props} />
  ),
}))

vi.mock('@/assets/custom/icon-sub2api', () => ({
  IconSub2api: ({ size }: { size?: number }) => (
    <span data-testid='sub2api' data-size={size} />
  ),
}))
vi.mock('@/assets/custom/icon-wan', () => ({
  IconWan: () => <span data-testid='wan' />,
}))
vi.mock('@/assets/brand-icons/sglang.svg', () => ({ default: 'sglang.svg' }))

import { getLobeIcon } from '@/lib/lobe-icon'

describe('getLobeIcon', () => {
  it('returns fallback "?" element for null input', () => {
    const { container } = render(<>{getLobeIcon(null)}</>)
    expect(container.textContent).toBe('?')
  })

  it('returns fallback "?" element for undefined input', () => {
    const { container } = render(<>{getLobeIcon(undefined)}</>)
    expect(container.textContent).toBe('?')
  })

  it('returns fallback "?" element for empty string', () => {
    const { container } = render(<>{getLobeIcon('')}</>)
    expect(container.textContent).toBe('?')
  })

  it('returns fallback "?" element for whitespace string', () => {
    const { container } = render(<>{getLobeIcon('   ')}</>)
    expect(container.textContent).toBe('?')
  })

  it('renders base icon component', async () => {
    const { findByTestId } = render(<>{getLobeIcon('OpenAI')}</>)
    expect(await findByTestId('openai')).toBeDefined()
  })

  it('renders sub-property icon (OpenAI.Color)', async () => {
    const { findByTestId } = render(<>{getLobeIcon('OpenAI.Color')}</>)
    expect(await findByTestId('openai-color')).toBeDefined()
  })

  it('renders sub-property icon (OpenAI.Avatar)', async () => {
    const { findByTestId } = render(<>{getLobeIcon('OpenAI.Avatar')}</>)
    expect(await findByTestId('openai-avatar')).toBeDefined()
  })

  it('passes size prop to icon', async () => {
    const { findByTestId } = render(<>{getLobeIcon('Claude', 32)}</>)
    const el = await findByTestId('claude')
    expect(el.getAttribute('size')).toBe('32')
  })

  it('uses default size of 20', async () => {
    const { findByTestId } = render(<>{getLobeIcon('Claude')}</>)
    const el = await findByTestId('claude')
    expect(el.getAttribute('size')).toBe('20')
  })

  it('returns first letter fallback for an icon not in the registry', () => {
    // NonFunction is absent from the mocked toc registry, so the renderer
    // takes the fallback path.
    const { container } = render(<>{getLobeIcon('NonFunction')}</>)
    expect(container.textContent).toBe('N')
  })

  it('renders custom icon (Sub2API)', () => {
    const { getByTestId } = render(<>{getLobeIcon('Sub2API', 24)}</>)
    const el = getByTestId('sub2api')
    expect(el.getAttribute('data-size')).toBe('24')
  })

  it('parses chained property with equals sign and quoted value', async () => {
    const { findByTestId } = render(
      <>{getLobeIcon("OpenAI.Avatar.type={'platform'}")}</>
    )
    const el = await findByTestId('openai-avatar')
    expect(el.getAttribute('type')).toBe('platform')
  })

  it('parses numeric property value', async () => {
    const { findByTestId } = render(<>{getLobeIcon('OpenAI.Color.size=48')}</>)
    const el = await findByTestId('openai-color')
    expect(el.getAttribute('size')).toBe('48')
  })

  it('applies size from fallback dimension style', () => {
    // NonFunction is absent from the registry, so it triggers the fallback div.
    const { container } = render(<>{getLobeIcon('NonFunction', 40)}</>)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })
})

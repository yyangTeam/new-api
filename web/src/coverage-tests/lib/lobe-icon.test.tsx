import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@lobehub/icons', () => {
  const OpenAIBase = (props: Record<string, unknown>) => <span data-testid="openai" {...props} />
  const OpenAIColor = (props: Record<string, unknown>) => <span data-testid="openai-color" {...props} />
  const OpenAIAvatar = (props: Record<string, unknown>) => <span data-testid="openai-avatar" {...props} />
  const ClaudeComp = (props: Record<string, unknown>) => <span data-testid="claude" {...props} />
  // NonFunctionIcon simulates an icon that is not a function/component (triggers fallback)
  const NonFunction = 'not-a-component'

  const OpenAI = Object.assign(OpenAIBase, { Color: OpenAIColor, Avatar: OpenAIAvatar })

  return {
    OpenAI,
    Claude: ClaudeComp,
    NonFunction,
  }
})

vi.mock('@/assets/custom/icon-sub2api', () => ({
  IconSub2api: ({ size }: { size?: number }) => (
    <span data-testid="sub2api" data-size={size} />
  ),
}))

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

  it('renders base icon component', () => {
    const { getByTestId } = render(<>{getLobeIcon('OpenAI')}</>)
    expect(getByTestId('openai')).toBeDefined()
  })

  it('renders sub-property icon (OpenAI.Color)', () => {
    const { getByTestId } = render(<>{getLobeIcon('OpenAI.Color')}</>)
    expect(getByTestId('openai-color')).toBeDefined()
  })

  it('renders sub-property icon (OpenAI.Avatar)', () => {
    const { getByTestId } = render(<>{getLobeIcon('OpenAI.Avatar')}</>)
    expect(getByTestId('openai-avatar')).toBeDefined()
  })

  it('passes size prop to icon', () => {
    const { getByTestId } = render(<>{getLobeIcon('Claude', 32)}</>)
    const el = getByTestId('claude')
    expect(el.getAttribute('size')).toBe('32')
  })

  it('uses default size of 20', () => {
    const { getByTestId } = render(<>{getLobeIcon('Claude')}</>)
    const el = getByTestId('claude')
    expect(el.getAttribute('size')).toBe('20')
  })

  it('returns first letter fallback for icon that is not a function/object', () => {
    // NonFunction is a string export in the mock, so it triggers the fallback path
    const { container } = render(<>{getLobeIcon('NonFunction')}</>)
    expect(container.textContent).toBe('N')
  })

  it('renders custom icon (Sub2API)', () => {
    const { getByTestId } = render(<>{getLobeIcon('Sub2API', 24)}</>)
    const el = getByTestId('sub2api')
    expect(el.getAttribute('data-size')).toBe('24')
  })

  it('parses chained property with equals sign and quoted value', () => {
    const { getByTestId } = render(<>{getLobeIcon("OpenAI.Avatar.type={'platform'}")}</>)
    const el = getByTestId('openai-avatar')
    expect(el.getAttribute('type')).toBe('platform')
  })

  it('parses numeric property value', () => {
    const { getByTestId } = render(<>{getLobeIcon('OpenAI.Color.size=48')}</>)
    const el = getByTestId('openai-color')
    expect(el.getAttribute('size')).toBe('48')
  })

  it('applies size from fallback dimension style', () => {
    // NonFunction is not a valid component, so it triggers the fallback div
    const { container } = render(<>{getLobeIcon('NonFunction', 40)}</>)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })
})

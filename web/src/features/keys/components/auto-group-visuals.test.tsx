import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import {
  AutoGroupFlowBorder,
  AutoGroupFrame,
  GroupRatioBadge,
  AutoGroupBadge,
  AUTO_GROUP_FRAME_CLASS_NAME,
} from './auto-group-visuals'

vi.mock('@/components/group-badge', () => ({
  GroupBadge: ({ group }: { group: string }) => <span data-testid='group-badge'>{group}</span>,
}))

describe('AUTO_GROUP_FRAME_CLASS_NAME', () => {
  test('is a non-empty string', () => {
    expect(AUTO_GROUP_FRAME_CLASS_NAME.length).toBeGreaterThan(0)
  })
})

describe('AutoGroupFlowBorder', () => {
  test('returns null when shouldReduceMotion is true', () => {
    const { container } = render(<AutoGroupFlowBorder shouldReduceMotion={true} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders flow border span when shouldReduceMotion is false', () => {
    const { container } = render(<AutoGroupFlowBorder shouldReduceMotion={false} />)
    const el = container.querySelector('[data-auto-group-flow-border]')
    expect(el).toBeInTheDocument()
  })
})

describe('AutoGroupFrame', () => {
  test('renders children with data attributes', () => {
    const { container } = render(
      <AutoGroupFrame effect='badge' shouldReduceMotion={true}>
        <span>child</span>
      </AutoGroupFrame>
    )
    const frame = container.querySelector('[data-auto-group-frame]')
    expect(frame).toBeInTheDocument()
    expect(frame?.getAttribute('data-auto-group-effect')).toBe('badge')
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  test('renders AutoGroupFlowBorder when shouldReduceMotion is false', () => {
    const { container } = render(
      <AutoGroupFrame effect='ratio' shouldReduceMotion={false}>
        <span>child</span>
      </AutoGroupFrame>
    )
    expect(container.querySelector('[data-auto-group-flow-border]')).toBeInTheDocument()
  })

  test('does not render AutoGroupFlowBorder when shouldReduceMotion is true', () => {
    const { container } = render(
      <AutoGroupFrame effect='ratio' shouldReduceMotion={true}>
        <span>child</span>
      </AutoGroupFrame>
    )
    expect(container.querySelector('[data-auto-group-flow-border]')).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <AutoGroupFrame effect='badge' shouldReduceMotion={true} className='custom'>
        <span>x</span>
      </AutoGroupFrame>
    )
    const frame = container.querySelector('[data-auto-group-frame]')
    expect(frame?.className).toContain('custom')
  })
})

describe('GroupRatioBadge', () => {
  test('returns null for undefined ratio', () => {
    const { container } = render(<GroupRatioBadge ratio={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  test('returns null for null ratio', () => {
    const { container } = render(<GroupRatioBadge ratio={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('returns null for empty string ratio', () => {
    const { container } = render(<GroupRatioBadge ratio='' />)
    expect(container.firstChild).toBeNull()
  })

  test('renders ratio label for numeric ratio', () => {
    const { container } = render(<GroupRatioBadge ratio={2} />)
    expect(container.textContent).toContain('2x')
    expect(container.textContent).toContain('Ratio')
  })

  test('renders auto ratio label for string ratio', () => {
    const { container } = render(<GroupRatioBadge ratio='auto' isAuto={true} />)
    expect(container.textContent).toContain('Auto')
    expect(container.textContent).toContain('Ratio')
  })

  test('wraps in AutoGroupFrame when isAuto is true', () => {
    const { container } = render(<GroupRatioBadge ratio={1} isAuto={true} />)
    expect(container.querySelector('[data-auto-group-frame]')).toBeInTheDocument()
  })

  test('does not wrap in AutoGroupFrame when isAuto is false', () => {
    const { container } = render(<GroupRatioBadge ratio={1} isAuto={false} />)
    expect(container.querySelector('[data-auto-group-frame]')).not.toBeInTheDocument()
  })
})

describe('AutoGroupBadge', () => {
  test('renders GroupBadge inside AutoGroupFrame', () => {
    const { container } = render(<AutoGroupBadge shouldReduceMotion={true} />)
    expect(container.querySelector('[data-auto-group-frame]')).toBeInTheDocument()
    expect(screen.getByTestId('group-badge')).toHaveTextContent('auto')
  })

  test('passes shouldReduceMotion through', () => {
    const { container } = render(<AutoGroupBadge shouldReduceMotion={false} />)
    expect(container.querySelector('[data-auto-group-flow-border]')).toBeInTheDocument()
  })
})

import { render } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: { className?: string; style?: React.CSSProperties }) => (
    <div data-testid='skeleton' className={props.className} style={props.style} />
  ),
}))

import { LoadingSkeleton } from './loading-skeleton'

describe('LoadingSkeleton', () => {
  test('renders card content by default', () => {
    const { container } = render(<LoadingSkeleton />)
    // Card grid layout: grid with 9 cards
    const grids = container.querySelectorAll('.grid')
    expect(grids.length).toBeGreaterThan(0)
  })

  test('renders card content when viewMode is card', () => {
    const { container } = render(<LoadingSkeleton viewMode='card' />)
    const grids = container.querySelectorAll('.grid')
    expect(grids.length).toBeGreaterThan(0)
  })

  test('renders table content when viewMode is table', () => {
    const { container } = render(<LoadingSkeleton viewMode='table' />)
    // Table skeleton has an overflow-hidden rounded-lg border wrapper
    const tableWrapper = container.querySelector('.overflow-hidden.rounded-lg')
    expect(tableWrapper).toBeInTheDocument()
  })

  test('renders skeleton elements', () => {
    const { getAllByTestId } = render(<LoadingSkeleton />)
    const skeletons = getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

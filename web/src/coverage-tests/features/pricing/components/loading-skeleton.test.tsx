import { render } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: { className?: string; style?: React.CSSProperties }) => (
    <div data-testid='skeleton' className={props.className} style={props.style} />
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: (props: { children?: React.ReactNode; className?: string }) => (
    <div data-testid='card' className={props.className}>{props.children}</div>
  ),
  CardHeader: (props: { children?: React.ReactNode; className?: string }) => (
    <div className={props.className}>{props.children}</div>
  ),
  CardContent: (props: { children?: React.ReactNode; className?: string }) => (
    <div className={props.className}>{props.children}</div>
  ),
  CardFooter: (props: { children?: React.ReactNode; className?: string }) => (
    <div className={props.className}>{props.children}</div>
  ),
}))

import { LoadingSkeleton } from '@/features/pricing/components/loading-skeleton'

describe('LoadingSkeleton', () => {
  test('renders card content by default', () => {
    const { container } = render(<LoadingSkeleton />)
    // Card grid layout: grid with 6 cards
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
    // Table skeleton has an overflow-hidden rounded-xl border wrapper
    const tableWrapper = container.querySelector('.overflow-hidden.rounded-xl')
    expect(tableWrapper).toBeInTheDocument()
  })

  test('renders skeleton elements', () => {
    const { getAllByTestId } = render(<LoadingSkeleton />)
    const skeletons = getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'

import { EmptyState } from '@/features/pricing/components/empty-state'

describe('EmptyState', () => {
  test('renders no models found message', () => {
    render(<EmptyState hasActiveFilters={false} onClearFilters={vi.fn()} />)
    expect(screen.getByText('No models found')).toBeInTheDocument()
  })

  test('renders filter message when no search query', () => {
    render(<EmptyState hasActiveFilters={true} onClearFilters={vi.fn()} />)
    expect(screen.getByText('No models match your current filters.')).toBeInTheDocument()
  })

  test('renders search query message when search is present', () => {
    render(<EmptyState searchQuery='gpt-5' hasActiveFilters={false} onClearFilters={vi.fn()} />)
    expect(screen.getByText(/No results for/)).toBeInTheDocument()
  })

  test('renders clear button when hasActiveFilters', () => {
    render(<EmptyState hasActiveFilters={true} onClearFilters={vi.fn()} />)
    expect(screen.getByText('Clear all filters')).toBeInTheDocument()
  })

  test('renders clear button when search query is present', () => {
    render(<EmptyState searchQuery='abc' hasActiveFilters={false} onClearFilters={vi.fn()} />)
    expect(screen.getByText('Clear all filters')).toBeInTheDocument()
  })

  test('does not render clear button when no filters and no search', () => {
    render(<EmptyState hasActiveFilters={false} onClearFilters={vi.fn()} />)
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument()
  })

  test('calls onClearFilters when button clicked', async () => {
    const onClear = vi.fn()
    render(<EmptyState hasActiveFilters={true} onClearFilters={onClear} />)
    await userEvent.click(screen.getByText('Clear all filters'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  test('treats whitespace-only search as no search', () => {
    render(<EmptyState searchQuery='   ' hasActiveFilters={false} onClearFilters={vi.fn()} />)
    expect(screen.getByText('No models match your current filters.')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { ApiKeyTimestampCell } from '@/features/keys/components/api-key-timestamp-cell'

vi.mock('@/lib/format', () => ({
  formatTimestampRelative: (ts: number) => `${ts}s ago`,
  formatTimestampToDate: (ts: number) => `2024-01-01 ${ts}`,
}))

describe('ApiKeyTimestampCell', () => {
  const defaultProps = {
    timestamp: 1700000000,
    now: 1700000120000,
    locale: 'en',
    justNowLabel: 'Just now',
  }

  test('renders dash when timestamp is 0', () => {
    render(<ApiKeyTimestampCell {...defaultProps} timestamp={0} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('renders dash when timestamp is -1', () => {
    render(<ApiKeyTimestampCell {...defaultProps} timestamp={-1} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('renders just now label when within 60 seconds', () => {
    const now = 1700000000 * 1000 + 30000 // 30s after
    render(<ApiKeyTimestampCell {...defaultProps} now={now} />)
    expect(screen.getByText('Just now')).toBeInTheDocument()
  })

  test('renders relative time when past 60 seconds', () => {
    // now is 120s after timestamp
    render(<ApiKeyTimestampCell {...defaultProps} />)
    expect(screen.getByText('1700000000s ago')).toBeInTheDocument()
  })

  test('renders with custom className', () => {
    render(<ApiKeyTimestampCell {...defaultProps} className='custom-class' />)
    const time = screen.getByRole('generic', { hidden: true })
    // The time element exists
    expect(document.querySelector('time')).toBeInTheDocument()
  })
})

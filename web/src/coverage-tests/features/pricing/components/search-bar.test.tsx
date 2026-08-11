import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { SearchBar } from '@/features/pricing/components/search-bar'

describe('SearchBar', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onClear: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders input with placeholder', () => {
    render(<SearchBar {...defaultProps} placeholder='Search...' />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  test('renders default placeholder when none provided', () => {
    render(<SearchBar {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument()
  })

  test('calls onChange when typing', () => {
    render(<SearchBar {...defaultProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'gpt' } })
    expect(defaultProps.onChange).toHaveBeenCalledWith('gpt')
  })

  test('shows clear button when value is non-empty', () => {
    render(<SearchBar {...defaultProps} value='test' />)
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  test('does not show clear button when value is empty', () => {
    render(<SearchBar {...defaultProps} value='' />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  test('calls onClear when clear button clicked', () => {
    render(<SearchBar {...defaultProps} value='test' />)
    fireEvent.click(screen.getByLabelText('Clear search'))
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1)
  })

  test('focuses input on Cmd+K', () => {
    render(<SearchBar {...defaultProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(document.activeElement).toBe(input)
  })

  test('focuses input on Ctrl+K', () => {
    render(<SearchBar {...defaultProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(input)
  })

  test('blurs input on Escape', () => {
    render(<SearchBar {...defaultProps} />)
    const input = screen.getByRole('textbox')
    input.focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).not.toBe(input)
  })

  test('applies custom className', () => {
    const { container } = render(<SearchBar {...defaultProps} className='custom' />)
    expect(container.firstChild).toHaveClass('custom')
  })
})

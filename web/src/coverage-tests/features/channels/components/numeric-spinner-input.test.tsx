import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { NumericSpinnerInput } from '@/features/channels/components/numeric-spinner-input'

vi.mock('lucide-react', () => ({
  Minus: () => <span data-testid='minus-icon'>-</span>,
  Plus: () => <span data-testid='plus-icon'>+</span>,
}))

describe('NumericSpinnerInput', () => {
  it('renders with value', () => {
    render(<NumericSpinnerInput value={5} onChange={vi.fn()} />)
    expect(screen.getByTitle('5')).toBeInTheDocument()
  })

  it('renders with null value as 0', () => {
    render(<NumericSpinnerInput value={null} onChange={vi.fn()} />)
    expect(screen.getByTitle('0')).toBeInTheDocument()
  })

  it('renders with undefined value as 0', () => {
    render(<NumericSpinnerInput value={undefined} onChange={vi.fn()} />)
    expect(screen.getByTitle('0')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<NumericSpinnerInput value={3} onChange={vi.fn()} label='Weight' />)
    expect(screen.getByText('Weight')).toBeInTheDocument()
  })

  it('increments value on plus click', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} />)
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    fireEvent.click(incrementBtn)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('decrements value on minus click', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} />)
    const decrementBtn = screen.getByRole('button', { name: 'Decrement' })
    fireEvent.click(decrementBtn)
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('respects min value', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={0} onChange={onChange} min={0} />)
    const decrementBtn = screen.getByRole('button', { name: 'Decrement' })
    fireEvent.click(decrementBtn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects max value', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={10} onChange={onChange} max={10} />)
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    fireEvent.click(incrementBtn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not interact when disabled', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} disabled />)
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    fireEvent.click(incrementBtn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses custom step', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={0} onChange={onChange} step={5} />)
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    fireEvent.click(incrementBtn)
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('enters edit mode on value click', () => {
    render(<NumericSpinnerInput value={5} onChange={vi.fn()} />)
    const valueBtn = screen.getByTitle('5')
    fireEvent.click(valueBtn)
    // Should show an input
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('5')
  })

  it('commits value on blur', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} />)
    // Enter edit mode
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('rejects non-numeric input', () => {
    render(<NumericSpinnerInput value={5} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input.value).toBe('5')
  })

  it('allows empty string while editing', () => {
    render(<NumericSpinnerInput value={5} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
  })

  it('allows minus sign while editing', () => {
    render(
      <NumericSpinnerInput value={5} onChange={vi.fn()} min={-10} />
    )
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-' } })
    expect(input.value).toBe('-')
  })

  it('reverts to original value on invalid input blur', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clamps to min on commit', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} min={0} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '-5' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('clamps to max on commit', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} max={10} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('calls onCommit when focus leaves the container', () => {
    const onCommit = vi.fn()
    render(
      <div>
        <NumericSpinnerInput value={5} onChange={vi.fn()} onCommit={onCommit} />
        <button data-testid='outside'>Outside</button>
      </div>
    )
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    fireEvent.focus(incrementBtn)
    fireEvent.blur(incrementBtn, { relatedTarget: screen.getByTestId('outside') })
    expect(onCommit).toHaveBeenCalled()
  })

  it('does not call onCommit when focus stays within container', () => {
    const onCommit = vi.fn()
    render(
      <NumericSpinnerInput value={5} onChange={vi.fn()} onCommit={onCommit} />
    )
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    const decrementBtn = screen.getByRole('button', { name: 'Decrement' })
    fireEvent.focus(incrementBtn)
    fireEvent.blur(incrementBtn, { relatedTarget: decrementBtn })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Escape key cancels edit', () => {
    render(<NumericSpinnerInput value={5} onChange={vi.fn()} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    // Should exit editing mode and revert
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByTitle('5')).toBeInTheDocument()
  })

  it('Enter key commits value', () => {
    const onChange = vi.fn()
    render(<NumericSpinnerInput value={5} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('5'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(8)
  })
})

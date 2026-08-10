import { render, screen, userEvent } from '@/test/test-utils'

import { DateTimePicker } from './datetime-picker'

describe('DateTimePicker', () => {
  test('renders placeholder text', () => {
    render(<DateTimePicker />)
    expect(screen.getByText('Select date')).toBeInTheDocument()
  })

  test('renders custom placeholder', () => {
    render(<DateTimePicker placeholder='Pick a date' />)
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  test('renders time input', () => {
    const { container } = render(<DateTimePicker />)
    const timeInput = container.querySelector('input[type="time"]')
    expect(timeInput).toBeInTheDocument()
  })

  test('time input is disabled when no date selected', () => {
    const { container } = render(<DateTimePicker />)
    const timeInput = container.querySelector('input[type="time"]')
    expect(timeInput).toBeDisabled()
  })

  test('renders with selected date', () => {
    const date = new Date(2024, 5, 15, 10, 30)
    render(<DateTimePicker value={date} />)
    expect(screen.getByText('2024-06-15')).toBeInTheDocument()
  })

  test('shows clear button when date is selected', () => {
    const date = new Date(2024, 5, 15)
    render(<DateTimePicker value={date} />)
    expect(screen.getByLabelText('Clear')).toBeInTheDocument()
  })

  test('does not show clear button when no date selected', () => {
    render(<DateTimePicker />)
    expect(screen.queryByLabelText('Clear')).not.toBeInTheDocument()
  })

  test('calls onChange with undefined when clear is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const date = new Date(2024, 5, 15)
    render(<DateTimePicker value={date} onChange={onChange} />)
    await user.click(screen.getByLabelText('Clear'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  test('applies custom className', () => {
    const { container } = render(
      <DateTimePicker className='custom-dtp' />
    )
    expect(container.firstElementChild).toHaveClass('custom-dtp')
  })

  test('can be disabled', () => {
    render(<DateTimePicker disabled />)
    const button = screen.getByText('Select date').closest('button')
    expect(button).toBeDisabled()
  })

  test('time input shows correct time for value', () => {
    const date = new Date(2024, 5, 15, 14, 30)
    const { container } = render(<DateTimePicker value={date} />)
    const timeInput = container.querySelector(
      'input[type="time"]'
    ) as HTMLInputElement
    expect(timeInput?.value).toBe('14:30')
  })
})

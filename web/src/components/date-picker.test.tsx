import { render, screen } from '@/test/test-utils'

import { DatePicker } from './date-picker'

vi.mock('@/components/ui/calendar', () => ({
  Calendar: (props: any) => <div data-testid='calendar'>Calendar</div>,
}))

describe('DatePicker', () => {
  test('renders placeholder when no date selected', () => {
    render(<DatePicker selected={undefined} onSelect={vi.fn()} />)
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  test('renders custom placeholder', () => {
    render(
      <DatePicker
        selected={undefined}
        onSelect={vi.fn()}
        placeholder='Choose date'
      />
    )
    expect(screen.getByText('Choose date')).toBeInTheDocument()
  })

  test('renders formatted date when selected', () => {
    const date = new Date('2024-03-15')
    render(<DatePicker selected={date} onSelect={vi.fn()} />)
    expect(screen.getByText('2024-03-15')).toBeInTheDocument()
  })

  test('renders trigger button', () => {
    render(<DatePicker selected={undefined} onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

import { render, screen, userEvent } from '@/test/test-utils'

import { ComboboxInput, type ComboboxInputOption } from './combobox-input'

const options: ComboboxInputOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

describe('ComboboxInput', () => {
  test('renders input with combobox role', () => {
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders with placeholder', () => {
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
        placeholder='Search...'
      />
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  test('displays selected option label', () => {
    render(
      <ComboboxInput
        options={options}
        value='apple'
        onValueChange={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('Apple')).toBeInTheDocument()
  })

  test('opens dropdown on focus', async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
      />
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  test('filters options based on input', async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
      />
    )
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.type(input, 'ban')
    const listItems = screen.getAllByRole('option')
    expect(listItems).toHaveLength(1)
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  test('calls onValueChange when option is selected', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={onValueChange}
      />
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Cherry'))
    expect(onValueChange).toHaveBeenCalledWith('cherry')
  })

  test('closes dropdown on escape', async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
      />
    )
    const input = screen.getByRole('combobox')
    await user.click(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
      />
    )
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    const highlighted = screen.getByText('Apple').closest('[data-highlighted]')
    expect(highlighted).toBeInTheDocument()
  })

  test('renders with custom id', () => {
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
        id='my-combobox'
      />
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'my-combobox')
  })

  test('does not open on focus when openOnFocus is false', async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        options={options}
        value=''
        onValueChange={vi.fn()}
        openOnFocus={false}
      />
    )
    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('shows check icon for selected option', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ComboboxInput
        options={options}
        value='apple'
        onValueChange={vi.fn()}
      />
    )
    await user.click(screen.getByRole('combobox'))
    const selectedOption = screen.getByText('Apple').closest('[aria-selected="true"]')
    expect(selectedOption).toBeInTheDocument()
  })

  test('displays raw value when no matching option', () => {
    render(
      <ComboboxInput
        options={options}
        value='custom-value'
        onValueChange={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('custom-value')).toBeInTheDocument()
  })
})

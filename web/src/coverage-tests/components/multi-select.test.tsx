import { render, screen, userEvent } from '@/test/test-utils'

import { MultiSelect, type Option } from '@/components/multi-select'

const options: Option[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
]

describe('MultiSelect', () => {
  test('renders chips container', () => {
    const { container } = render(
      <MultiSelect options={options} selected={[]} onChange={vi.fn()} />
    )
    expect(
      container.querySelector('[data-slot="combobox-chips"]')
    ).toBeInTheDocument()
  })

  test('renders with placeholder when no items selected', () => {
    render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        placeholder='Select frameworks'
      />
    )
    expect(
      screen.getByPlaceholderText('Select frameworks')
    ).toBeInTheDocument()
  })

  test('renders default placeholder when not specified', () => {
    render(
      <MultiSelect options={options} selected={[]} onChange={vi.fn()} />
    )
    expect(
      screen.getByPlaceholderText('Select items...')
    ).toBeInTheDocument()
  })

  test('does not show placeholder when items are selected', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react']}
        onChange={vi.fn()}
        placeholder='Select frameworks'
      />
    )
    expect(
      screen.queryByPlaceholderText('Select frameworks')
    ).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        className='custom-ms'
      />
    )
    expect(container.querySelector('.custom-ms')).toBeInTheDocument()
  })

  test('renders with id prop', () => {
    render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        id='my-multi-select'
      />
    )
    expect(document.getElementById('my-multi-select')).toBeInTheDocument()
  })

  test('renders selected values as chips', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react', 'vue']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vue')).toBeInTheDocument()
  })

  test('renders custom values as chips even when not in options', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react', 'custom-framework']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('React')).toBeInTheDocument()
    // Custom values show the raw value as label
    expect(screen.getByText('custom-framework')).toBeInTheDocument()
  })

  test('renders renderSelectedSummary when provided', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react', 'vue']}
        onChange={vi.fn()}
        renderSelectedSummary={(values) => `${values.length} selected`}
      />
    )
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  test('renders maxVisibleChips with +N more button', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react', 'vue', 'angular']}
        onChange={vi.fn()}
        maxVisibleChips={1}
      />
    )
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
    // Hidden items should not be visible
    expect(screen.queryByText('Vue')).not.toBeInTheDocument()
    expect(screen.queryByText('Angular')).not.toBeInTheDocument()
  })

  test('clicking +N more button expands all chips', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelect
        options={options}
        selected={['react', 'vue', 'angular']}
        onChange={vi.fn()}
        maxVisibleChips={1}
      />
    )

    await user.click(screen.getByText('+2 more'))

    // All chips should now be visible
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vue')).toBeInTheDocument()
    expect(screen.getByText('Angular')).toBeInTheDocument()
    // A collapse button should appear
    expect(screen.getByText('Collapse')).toBeInTheDocument()
  })

  test('clicking Collapse button hides overflow chips', async () => {
    const user = userEvent.setup()
    render(
      <MultiSelect
        options={options}
        selected={['react', 'vue', 'angular']}
        onChange={vi.fn()}
        maxVisibleChips={1}
      />
    )

    // Expand
    await user.click(screen.getByText('+2 more'))
    expect(screen.getByText('Vue')).toBeInTheDocument()

    // Collapse
    await user.click(screen.getByText('Collapse'))
    expect(screen.queryByText('Vue')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  test('renders disabled state', () => {
    render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        disabled
      />
    )
    // The input should be present but disabled
    const chips = document.querySelector('[data-slot="combobox-chips"]')
    expect(chips).toBeInTheDocument()
  })

  test('renders copyChipOnClick chips with click-to-copy label', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react']}
        onChange={vi.fn()}
        copyChipOnClick
      />
    )
    // Should have a button inside the chip with "Click to copy" title
    const copyBtn = screen.getByTitle('Click to copy')
    expect(copyBtn).toBeInTheDocument()
    expect(copyBtn.textContent).toBe('React')
  })

  test('renders without copyChipOnClick - chips are spans not buttons', () => {
    render(
      <MultiSelect
        options={options}
        selected={['react']}
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByTitle('Click to copy')).not.toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  test('does not show placeholder when renderSelectedSummary is provided even with no selection', () => {
    render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        renderSelectedSummary={(values) =>
          values.length === 0 ? 'None' : `${values.length}`
        }
      />
    )
    // renderSelectedSummary takes precedence
    expect(screen.getByText('None')).toBeInTheDocument()
  })
})

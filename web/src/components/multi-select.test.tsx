import { render, screen } from '@/test/test-utils'

import { MultiSelect, type Option } from './multi-select'

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn(() => Promise.resolve(true)),
}))

const options: Option[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
]

describe('MultiSelect', () => {
  test('renders chips container', () => {
    const { container } = render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
      />
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
  })
})

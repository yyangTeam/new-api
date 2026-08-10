import { render, screen } from '@/test/test-utils'

import { JsonEditor } from './json-editor'

vi.mock('@/components/json-code-editor', () => ({
  JsonCodeEditor: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
  }) => (
    <textarea
      data-testid='json-code-editor'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

describe('JsonEditor', () => {
  test('renders component without crashing', () => {
    const { container } = render(
      <JsonEditor value='{}' onChange={vi.fn()} />
    )
    expect(container.firstElementChild).toBeInTheDocument()
  })

  test('renders with key-value rows for valid JSON', () => {
    render(
      <JsonEditor value='{"name":"test","age":"25"}' onChange={vi.fn()} />
    )
    expect(screen.getByDisplayValue('name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test')).toBeInTheDocument()
  })

  test('renders add button', () => {
    render(<JsonEditor value='{}' onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  test('renders empty message when value is empty', () => {
    render(
      <JsonEditor
        value='{}'
        onChange={vi.fn()}
        emptyMessage='No entries yet'
      />
    )
    expect(screen.getByText('No entries yet')).toBeInTheDocument()
  })
})

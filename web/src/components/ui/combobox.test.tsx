import { render, screen } from '@/test/test-utils'

import { Combobox } from './combobox'

describe('Combobox', () => {
  test('renders legacy mode with options prop', () => {
    render(
      <Combobox
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        value='a'
        onValueChange={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders legacy mode with placeholder', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        searchPlaceholder='Search items'
      />
    )
    expect(screen.getByPlaceholderText('Search items')).toBeInTheDocument()
  })

  test('renders legacy mode with custom className', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        className='custom-combo'
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders base-ui mode without options prop', () => {
    const { container } = render(
      <Combobox>
        <div>Base UI content</div>
      </Combobox>
    )
    expect(container.textContent).toContain('Base UI content')
  })
})

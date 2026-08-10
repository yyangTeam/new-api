import { render, screen } from '@/test/test-utils'

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from './combobox'

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

  test('renders legacy mode with placeholder fallback', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        placeholder='Choose one'
      />
    )
    // placeholder falls back to searchPlaceholder ?? placeholder
    expect(screen.getByPlaceholderText('Choose one')).toBeInTheDocument()
  })

  test('renders legacy mode with no value defaults empty string', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        onValueChange={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders legacy mode with allowCustomValue', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        allowCustomValue
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders legacy mode with openOnFocus', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        openOnFocus
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders legacy mode with emptyText', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        emptyText='Nothing here'
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('renders legacy mode with id', () => {
    render(
      <Combobox
        options={[{ value: 'a', label: 'Alpha' }]}
        value=''
        onValueChange={vi.fn()}
        id='my-combobox'
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

describe('ComboboxInput', () => {
  test('renders with showTrigger=true (default)', () => {
    const { container } = render(
      <Combobox>
        <ComboboxInput placeholder='Search...' />
      </Combobox>
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  test('renders with showTrigger=false', () => {
    render(
      <Combobox>
        <ComboboxInput showTrigger={false} placeholder='No trigger' />
      </Combobox>
    )
    expect(screen.getByPlaceholderText('No trigger')).toBeInTheDocument()
  })

  test('renders with showClear=true', () => {
    render(
      <Combobox>
        <ComboboxInput showClear placeholder='Clearable' />
      </Combobox>
    )
    expect(screen.getByPlaceholderText('Clearable')).toBeInTheDocument()
  })

  test('renders disabled state', () => {
    render(
      <Combobox>
        <ComboboxInput disabled placeholder='Disabled' />
      </Combobox>
    )
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  test('renders children (like dropdown content)', () => {
    const { container } = render(
      <Combobox>
        <ComboboxInput placeholder='With children'>
          <div data-testid='child-content'>Child</div>
        </ComboboxInput>
      </Combobox>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })
})

describe('ComboboxGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox>
        <ComboboxGroup>
          <span>Group items</span>
        </ComboboxGroup>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-group"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Combobox>
        <ComboboxGroup className='grp-custom'>
          <span>Items</span>
        </ComboboxGroup>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-group"]')
    ).toHaveClass('grp-custom')
  })
})

describe('ComboboxLabel', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox>
        <ComboboxGroup>
          <ComboboxLabel>Label</ComboboxLabel>
        </ComboboxGroup>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-label"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
  })
})

describe('ComboboxSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox>
        <ComboboxSeparator />
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-separator"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Combobox>
        <ComboboxSeparator className='sep-custom' />
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-separator"]')
    ).toHaveClass('sep-custom')
  })
})

describe('ComboboxChips', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox multiple value={[]} onValueChange={vi.fn()}>
        <ComboboxChips>
          <ComboboxChipsInput placeholder='Type...' />
        </ComboboxChips>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-chips"]')
    ).toBeInTheDocument()
  })
})

describe('ComboboxChip', () => {
  test('renders with remove button by default', () => {
    const { container } = render(
      <Combobox multiple value={['a']} onValueChange={vi.fn()}>
        <ComboboxChips>
          <ComboboxChip>Tag A</ComboboxChip>
        </ComboboxChips>
      </Combobox>
    )
    expect(screen.getByText('Tag A')).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="combobox-chip-remove"]')
    ).toBeInTheDocument()
  })

  test('renders without remove button when showRemove=false', () => {
    const { container } = render(
      <Combobox multiple value={['a']} onValueChange={vi.fn()}>
        <ComboboxChips>
          <ComboboxChip showRemove={false}>Tag B</ComboboxChip>
        </ComboboxChips>
      </Combobox>
    )
    expect(screen.getByText('Tag B')).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="combobox-chip-remove"]')
    ).not.toBeInTheDocument()
  })
})

describe('ComboboxChipsInput', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox multiple value={[]} onValueChange={vi.fn()}>
        <ComboboxChips>
          <ComboboxChipsInput placeholder='Add tags' />
        </ComboboxChips>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-chip-input"]')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add tags')).toBeInTheDocument()
  })
})

describe('ComboboxEmpty', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Combobox>
        <ComboboxEmpty>No results</ComboboxEmpty>
      </Combobox>
    )
    expect(
      container.querySelector('[data-slot="combobox-empty"]')
    ).toBeInTheDocument()
  })
})

describe('ComboboxCollection', () => {
  test('renders within combobox context', () => {
    // ComboboxCollection requires popup context; verify it renders without error
    const { container } = render(
      <Combobox items={['a', 'b']} value={null} onValueChange={vi.fn()}>
        <ComboboxCollection>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxCollection>
      </Combobox>
    )
    expect(container).toBeInTheDocument()
  })
})

describe('useComboboxAnchor', () => {
  test('returns a ref object', () => {
    const { result } = (() => {
      let ref: React.RefObject<HTMLDivElement | null> | undefined
      function TestComp() {
        ref = useComboboxAnchor()
        return <div ref={ref}>Anchor</div>
      }
      render(<TestComp />)
      return { result: ref }
    })()
    expect(result).toBeDefined()
    expect(result!.current).toBeInstanceOf(HTMLDivElement)
  })
})

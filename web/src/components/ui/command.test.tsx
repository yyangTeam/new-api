import { render, screen } from '@/test/test-utils'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command'

describe('Command', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder='Search...' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(container.querySelector('[data-slot="command"]')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Command className='custom-cmd'>
        <CommandList>
          <CommandEmpty>Empty</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(container.querySelector('[data-slot="command"]')).toHaveClass(
      'custom-cmd'
    )
  })
})

describe('CommandInput', () => {
  test('renders input with placeholder', () => {
    render(
      <Command>
        <CommandInput placeholder='Type here...' />
        <CommandList>
          <CommandEmpty>Empty</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
  })
})

describe('CommandList', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(
      container.querySelector('[data-slot="command-list"]')
    ).toBeInTheDocument()
  })
})

describe('CommandEmpty', () => {
  test('renders empty text', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })
})

describe('CommandGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandGroup heading='Group 1'>
            <CommandItem>Item 1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    expect(
      container.querySelector('[data-slot="command-group"]')
    ).toBeInTheDocument()
  })

  test('renders heading', () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading='My Group'>
            <CommandItem>Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('My Group')).toBeInTheDocument()
  })
})

describe('CommandItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandItem>Click me</CommandItem>
        </CommandList>
      </Command>
    )
    expect(
      container.querySelector('[data-slot="command-item"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem>My Item</CommandItem>
        </CommandList>
      </Command>
    )
    expect(screen.getByText('My Item')).toBeInTheDocument()
  })
})

describe('CommandSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandItem>A</CommandItem>
          <CommandSeparator />
          <CommandItem>B</CommandItem>
        </CommandList>
      </Command>
    )
    expect(
      container.querySelector('[data-slot="command-separator"]')
    ).toBeInTheDocument()
  })
})

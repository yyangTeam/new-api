import { render, screen } from '@/test/test-utils'

import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from './dropdown-menu'

describe('DropdownMenu', () => {
  test('renders trigger text', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
      </DropdownMenu>
    )
    expect(screen.getByText('Open Menu')).toBeInTheDocument()
  })

  test('renders trigger with data-slot', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      </DropdownMenu>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-trigger"]')
    ).toBeInTheDocument()
  })
})

describe('DropdownMenuShortcut', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <DropdownMenuShortcut>Ctrl+K</DropdownMenuShortcut>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-shortcut"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <DropdownMenuShortcut className='custom-sc'>Ctrl+K</DropdownMenuShortcut>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-shortcut"]')
    ).toHaveClass('custom-sc')
  })
})

describe('DropdownMenuLabel', () => {
  test('renders with data-slot inside a menu', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Section</DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenu>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-label"]')
    ).toBeInTheDocument()
  })

  test('renders with inset prop', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuGroup>
          <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenu>
    )
    const label = container.querySelector('[data-slot="dropdown-menu-label"]')
    expect(label?.getAttribute('data-inset')).toBe('true')
  })
})

describe('DropdownMenuSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuSeparator />
      </DropdownMenu>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-separator"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuSeparator className='custom-sep' />
      </DropdownMenu>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-separator"]')
    ).toHaveClass('custom-sep')
  })
})

describe('DropdownMenuGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group</DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenu>
    )
    expect(
      container.querySelector('[data-slot="dropdown-menu-group"]')
    ).toBeInTheDocument()
  })
})

describe('DropdownMenuPortal', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <div>Portal Content</div>
        </DropdownMenuPortal>
      </DropdownMenu>
    )
    expect(container).toBeInTheDocument()
  })
})

describe('DropdownMenuSub', () => {
  test('renders within menu context', () => {
    // SubmenuTrigger requires MenuPositioner context from an open menu,
    // so we just verify the wrapping component renders without error.
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuSub>
          <span>Sub menu placeholder</span>
        </DropdownMenuSub>
      </DropdownMenu>
    )
    expect(screen.getByText('Menu')).toBeInTheDocument()
  })
})

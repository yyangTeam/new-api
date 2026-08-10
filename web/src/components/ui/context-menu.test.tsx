import { render, screen } from '@/test/test-utils'

import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuTrigger,
} from './context-menu'

describe('ContextMenu', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Right click me</ContextMenuTrigger>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Context target</ContextMenuTrigger>
      </ContextMenu>
    )
    expect(screen.getByText('Context target')).toBeInTheDocument()
  })

  test('applies custom className to trigger', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger className='custom-trigger'>
          Target
        </ContextMenuTrigger>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-trigger"]')
    ).toHaveClass('custom-trigger')
  })
})

describe('ContextMenuShortcut', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
    )
    expect(
      container.querySelector('[data-slot="context-menu-shortcut"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Ctrl+Z')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ContextMenuShortcut className='sc-custom'>Ctrl+C</ContextMenuShortcut>
    )
    expect(
      container.querySelector('[data-slot="context-menu-shortcut"]')
    ).toHaveClass('sc-custom')
  })
})

describe('ContextMenuLabel', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuGroup>
          <ContextMenuLabel>Actions</ContextMenuLabel>
        </ContextMenuGroup>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-label"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  test('renders with inset', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuGroup>
          <ContextMenuLabel inset>Inset Label</ContextMenuLabel>
        </ContextMenuGroup>
      </ContextMenu>
    )
    const label = container.querySelector('[data-slot="context-menu-label"]')
    expect(label?.getAttribute('data-inset')).toBe('true')
  })
})

describe('ContextMenuSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuSeparator />
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-separator"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuSeparator className='sep-custom' />
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-separator"]')
    ).toHaveClass('sep-custom')
  })
})

describe('ContextMenuGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuGroup>
          <ContextMenuLabel>Group</ContextMenuLabel>
        </ContextMenuGroup>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-group"]')
    ).toBeInTheDocument()
  })
})

describe('ContextMenuSub', () => {
  test('renders within context menu', () => {
    // SubmenuTrigger requires MenuPositioner context from an open menu.
    // We verify the wrapping component renders without error.
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuSub>
          <span>Sub placeholder</span>
        </ContextMenuSub>
      </ContextMenu>
    )
    expect(screen.getByText('Menu')).toBeInTheDocument()
  })
})

describe('ContextMenuRadioGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuRadioGroup value='a'>
          <span>Radio Items</span>
        </ContextMenuRadioGroup>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-radio-group"]')
    ).toBeInTheDocument()
  })
})

describe('ContextMenuPortal', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Menu</ContextMenuTrigger>
        <ContextMenuPortal>
          <div>Portal content</div>
        </ContextMenuPortal>
      </ContextMenu>
    )
    expect(container).toBeInTheDocument()
  })
})

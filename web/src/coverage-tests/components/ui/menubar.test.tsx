import { render, screen } from '@/test/test-utils'

import {
  Menubar,
  MenubarGroup,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarTrigger,
} from '@/components/ui/menubar'

describe('Menubar', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Menubar />)
    expect(
      container.querySelector('[data-slot="menubar"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Menubar className='custom-mb' />)
    expect(
      container.querySelector('[data-slot="menubar"]')
    ).toHaveClass('custom-mb')
  })

  test('renders children', () => {
    render(
      <Menubar>
        <span>Menu Items</span>
      </Menubar>
    )
    expect(screen.getByText('Menu Items')).toBeInTheDocument()
  })
})

describe('MenubarMenu', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-trigger"]')
    ).toBeInTheDocument()
    expect(screen.getByText('File')).toBeInTheDocument()
  })

  test('renders trigger with custom className', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger className='custom-trigger'>Edit</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-trigger"]')
    ).toHaveClass('custom-trigger')
  })
})

describe('MenubarLabel', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarGroup>
            <MenubarLabel>Section</MenubarLabel>
          </MenubarGroup>
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-label"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Section')).toBeInTheDocument()
  })

  test('renders with inset prop', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarGroup>
            <MenubarLabel inset>Inset Label</MenubarLabel>
          </MenubarGroup>
        </MenubarMenu>
      </Menubar>
    )
    const label = container.querySelector('[data-slot="menubar-label"]')
    expect(label?.getAttribute('data-inset')).toBe('true')
  })
})

describe('MenubarSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarSeparator />
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-separator"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarSeparator className='sep-custom' />
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-separator"]')
    ).toHaveClass('sep-custom')
  })
})

describe('MenubarShortcut', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <MenubarShortcut>Ctrl+N</MenubarShortcut>
    )
    expect(
      container.querySelector('[data-slot="menubar-shortcut"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <MenubarShortcut className='sc-custom'>Ctrl+S</MenubarShortcut>
    )
    expect(
      container.querySelector('[data-slot="menubar-shortcut"]')
    ).toHaveClass('sc-custom')
  })
})

describe('MenubarSub', () => {
  test('renders within menubar context', () => {
    // SubmenuTrigger requires MenuPositioner context from an open menu.
    // We verify the wrapping component renders without error.
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarSub>
            <span>Sub placeholder</span>
          </MenubarSub>
        </MenubarMenu>
      </Menubar>
    )
    expect(screen.getByText('Menu')).toBeInTheDocument()
  })
})

describe('MenubarGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarGroup>
            <MenubarLabel>Group</MenubarLabel>
          </MenubarGroup>
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-group"]')
    ).toBeInTheDocument()
  })
})

describe('MenubarRadioGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarRadioGroup value='a'>
            <span>Radio Items</span>
          </MenubarRadioGroup>
        </MenubarMenu>
      </Menubar>
    )
    expect(
      container.querySelector('[data-slot="menubar-radio-group"]')
    ).toBeInTheDocument()
  })
})

describe('MenubarPortal', () => {
  test('renders without error', () => {
    const { container } = render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Menu</MenubarTrigger>
          <MenubarPortal>
            <div>Portal</div>
          </MenubarPortal>
        </MenubarMenu>
      </Menubar>
    )
    expect(container).toBeInTheDocument()
  })
})

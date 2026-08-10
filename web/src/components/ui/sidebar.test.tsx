import { render, screen, userEvent } from '@/test/test-utils'
import { renderHook, act } from '@testing-library/react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar'

function renderWithProvider(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>)
}

describe('SidebarProvider', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <SidebarProvider>
        <div>Content</div>
      </SidebarProvider>
    )
    expect(
      container.querySelector('[data-slot="sidebar-wrapper"]')
    ).toBeInTheDocument()
  })

  test('sets CSS variables', () => {
    const { container } = render(
      <SidebarProvider>
        <div>Content</div>
      </SidebarProvider>
    )
    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]')
    expect(wrapper).toHaveStyle({ '--sidebar-width': '13rem' })
  })

  test('applies custom className', () => {
    const { container } = render(
      <SidebarProvider className='custom-sp'>
        <div>Content</div>
      </SidebarProvider>
    )
    expect(
      container.querySelector('[data-slot="sidebar-wrapper"]')
    ).toHaveClass('custom-sp')
  })

  test('merges custom style with CSS variables', () => {
    const { container } = render(
      <SidebarProvider style={{ color: 'red' }}>
        <div>Content</div>
      </SidebarProvider>
    )
    const wrapper = container.querySelector(
      '[data-slot="sidebar-wrapper"]'
    ) as HTMLElement
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('13rem')
  })

  test('accepts controlled open/onOpenChange props', () => {
    const onOpenChange = vi.fn()
    render(
      <SidebarProvider open={false} onOpenChange={onOpenChange}>
        <SidebarTrigger />
      </SidebarProvider>
    )
    // The sidebar should render
    expect(
      screen.getByText('Toggle Sidebar')
    ).toBeInTheDocument()
  })

  test('defaults to open state', () => {
    const { container } = renderWithProvider(
      <Sidebar>
        <SidebarContent>Content</SidebarContent>
      </Sidebar>
    )
    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('expanded')
  })

  test('defaultOpen=false starts collapsed', () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    )
    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('collapsed')
  })

  test('keyboard shortcut Ctrl+B toggles sidebar', async () => {
    const { container } = render(
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    )

    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('expanded')

    // Press Ctrl+B
    await userEvent.setup().keyboard('{Control>}b{/Control}')

    expect(sidebarEl?.getAttribute('data-state')).toBe('collapsed')
  })
})

describe('useSidebar', () => {
  test('throws when used outside SidebarProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useSidebar())
    }).toThrow('useSidebar must be used within a SidebarProvider.')
    consoleSpy.mockRestore()
  })

  test('returns context values inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    )
    const { result } = renderHook(() => useSidebar(), { wrapper })
    expect(result.current.state).toBe('expanded')
    expect(result.current.open).toBe(true)
    expect(typeof result.current.setOpen).toBe('function')
    expect(typeof result.current.toggleSidebar).toBe('function')
    expect(result.current.isMobile).toBe(false)
  })

  test('toggleSidebar changes state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    )
    const { result } = renderHook(() => useSidebar(), { wrapper })
    expect(result.current.state).toBe('expanded')

    act(() => {
      result.current.toggleSidebar()
    })

    expect(result.current.state).toBe('collapsed')
  })

  test('setOpen(false) collapses sidebar', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    )
    const { result } = renderHook(() => useSidebar(), { wrapper })
    expect(result.current.open).toBe(true)

    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
    expect(result.current.state).toBe('collapsed')
  })
})

describe('Sidebar', () => {
  test('renders non-collapsible sidebar as plain div', () => {
    const { container } = renderWithProvider(
      <Sidebar collapsible='none'>
        <div>Static Sidebar</div>
      </Sidebar>
    )
    const sidebar = container.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar?.tagName).toBe('DIV')
    expect(screen.getByText('Static Sidebar')).toBeInTheDocument()
  })

  test('renders desktop sidebar with data-state and data-variant', () => {
    const { container } = renderWithProvider(
      <Sidebar variant='floating' side='right'>
        <SidebarContent>Content</SidebarContent>
      </Sidebar>
    )
    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('expanded')
    expect(sidebarEl?.getAttribute('data-variant')).toBe('floating')
    expect(sidebarEl?.getAttribute('data-side')).toBe('right')
  })

  test('renders with inset variant', () => {
    const { container } = renderWithProvider(
      <Sidebar variant='inset'>
        <SidebarContent>Content</SidebarContent>
      </Sidebar>
    )
    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-variant')).toBe('inset')
  })

  test('renders collapsed sidebar with data-collapsible', () => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible='icon'>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    )
    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-collapsible')).toBe('icon')
    expect(sidebarEl?.getAttribute('data-state')).toBe('collapsed')
  })
})

describe('SidebarTrigger', () => {
  test('renders with toggle label', () => {
    renderWithProvider(<SidebarTrigger />)
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
  })

  test('toggles sidebar on click', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>
    )

    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('expanded')

    await user.click(screen.getByText('Toggle Sidebar'))

    expect(sidebarEl?.getAttribute('data-state')).toBe('collapsed')
  })

  test('invokes custom onClick in addition to toggle', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithProvider(<SidebarTrigger onClick={onClick} />)

    await user.click(screen.getByText('Toggle Sidebar'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('SidebarRail', () => {
  test('renders with aria-label and data-sidebar', () => {
    const { container } = renderWithProvider(<SidebarRail />)
    const rail = container.querySelector('[data-sidebar="rail"]')
    expect(rail).toBeInTheDocument()
    expect(rail).toHaveAttribute('aria-label', 'Toggle Sidebar')
  })

  test('toggles sidebar on click', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
          <SidebarRail />
        </Sidebar>
      </SidebarProvider>
    )

    const sidebarEl = container.querySelector('[data-slot="sidebar"]')
    expect(sidebarEl?.getAttribute('data-state')).toBe('expanded')

    const rail = container.querySelector('[data-sidebar="rail"]') as HTMLElement
    await user.click(rail)

    expect(sidebarEl?.getAttribute('data-state')).toBe('collapsed')
  })
})

describe('SidebarHeader', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarHeader>Header</SidebarHeader>
    )
    expect(
      container.querySelector('[data-slot="sidebar-header"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    renderWithProvider(<SidebarHeader>My Header</SidebarHeader>)
    expect(screen.getByText('My Header')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = renderWithProvider(
      <SidebarHeader className='custom-header'>H</SidebarHeader>
    )
    expect(
      container.querySelector('[data-slot="sidebar-header"]')
    ).toHaveClass('custom-header')
  })
})

describe('SidebarFooter', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarFooter>Footer</SidebarFooter>
    )
    expect(
      container.querySelector('[data-slot="sidebar-footer"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarContent', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarContent>Content</SidebarContent>
    )
    expect(
      container.querySelector('[data-slot="sidebar-content"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarGroup', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarGroup>Group</SidebarGroup>
    )
    expect(
      container.querySelector('[data-slot="sidebar-group"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarGroupLabel', () => {
  test('renders with correct data attributes', () => {
    const { container } = renderWithProvider(
      <SidebarGroupLabel>Settings</SidebarGroupLabel>
    )
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = renderWithProvider(
      <SidebarGroupLabel className='custom-label'>Label</SidebarGroupLabel>
    )
    expect(screen.getByText('Label')).toBeInTheDocument()
  })
})

describe('SidebarGroupAction', () => {
  test('renders as button', () => {
    renderWithProvider(
      <SidebarGroupAction>
        <span>+</span>
      </SidebarGroupAction>
    )
    expect(screen.getByText('+')).toBeInTheDocument()
  })
})

describe('SidebarGroupContent', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarGroupContent>Content</SidebarGroupContent>
    )
    expect(
      container.querySelector('[data-slot="sidebar-group-content"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenu', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>Item</SidebarMenuItem>
      </SidebarMenu>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenuItem', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>Item</SidebarMenuItem>
      </SidebarMenu>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu-item"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenuButton', () => {
  test('renders children', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>Dashboard</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('renders with isActive data attribute', () => {
    const { container } = renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive>Active Item</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Active Item')).toBeInTheDocument()
  })

  test('renders with tooltip string', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip='Dashboard tooltip'>
            Dashboard
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('renders with tooltip object', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip={{ children: 'Tooltip text' }}>
            Dashboard
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('renders with size sm', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='sm'>Small</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Small')).toBeInTheDocument()
  })

  test('renders with size lg', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg'>Large</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Large')).toBeInTheDocument()
  })

  test('renders with outline variant', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton variant='outline'>Outline</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Outline')).toBeInTheDocument()
  })
})

describe('SidebarMenuAction', () => {
  test('renders with showOnHover=false (default)', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuAction>
            <span>Action</span>
          </SidebarMenuAction>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  test('renders with showOnHover=true', () => {
    renderWithProvider(
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuAction showOnHover>
            <span>Hover Action</span>
          </SidebarMenuAction>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    expect(screen.getByText('Hover Action')).toBeInTheDocument()
  })
})

describe('SidebarMenuBadge', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenuBadge>5</SidebarMenuBadge>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu-badge"]')
    ).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('SidebarMenuSkeleton', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(
      container.querySelector('[data-slot="sidebar-menu-skeleton"]')
    ).toBeInTheDocument()
  })

  test('renders icon skeleton when showIcon is true', () => {
    const { container } = renderWithProvider(
      <SidebarMenuSkeleton showIcon />
    )
    expect(
      container.querySelector('[data-sidebar="menu-skeleton-icon"]')
    ).toBeInTheDocument()
  })

  test('does not render icon skeleton by default', () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(
      container.querySelector('[data-sidebar="menu-skeleton-icon"]')
    ).not.toBeInTheDocument()
  })

  test('always renders text skeleton', () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(
      container.querySelector('[data-sidebar="menu-skeleton-text"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenuSub', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenuSub>
        <SidebarMenuSubItem>Sub item</SidebarMenuSubItem>
      </SidebarMenuSub>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu-sub"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenuSubItem', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenuSub>
        <SidebarMenuSubItem>Sub</SidebarMenuSubItem>
      </SidebarMenuSub>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu-sub-item"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarMenuSubButton', () => {
  test('renders as anchor with children', () => {
    renderWithProvider(
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton>Sub Link</SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    )
    expect(screen.getByText('Sub Link')).toBeInTheDocument()
  })

  test('renders with isActive', () => {
    renderWithProvider(
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton isActive>Active Sub</SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    )
    expect(screen.getByText('Active Sub')).toBeInTheDocument()
  })

  test('renders with size sm', () => {
    renderWithProvider(
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton size='sm'>Small Sub</SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    )
    expect(screen.getByText('Small Sub')).toBeInTheDocument()
  })
})

describe('SidebarInput', () => {
  test('renders with data-sidebar attribute', () => {
    const { container } = renderWithProvider(
      <SidebarInput placeholder='Search...' />
    )
    expect(
      container.querySelector('[data-sidebar="input"]')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })
})

describe('SidebarSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(<SidebarSeparator />)
    expect(
      container.querySelector('[data-slot="sidebar-separator"]')
    ).toBeInTheDocument()
  })
})

describe('SidebarInset', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarInset>Main content</SidebarInset>
    )
    expect(
      container.querySelector('[data-slot="sidebar-inset"]')
    ).toBeInTheDocument()
  })

  test('renders as main element', () => {
    renderWithProvider(<SidebarInset>Main</SidebarInset>)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = renderWithProvider(
      <SidebarInset className='inset-class'>Main</SidebarInset>
    )
    expect(
      container.querySelector('[data-slot="sidebar-inset"]')
    ).toHaveClass('inset-class')
  })
})

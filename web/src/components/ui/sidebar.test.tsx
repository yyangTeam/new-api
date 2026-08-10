import { render, screen } from '@/test/test-utils'

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
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

describe('SidebarMenuBadge', () => {
  test('renders with data-slot', () => {
    const { container } = renderWithProvider(
      <SidebarMenuBadge>5</SidebarMenuBadge>
    )
    expect(
      container.querySelector('[data-slot="sidebar-menu-badge"]')
    ).toBeInTheDocument()
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
})

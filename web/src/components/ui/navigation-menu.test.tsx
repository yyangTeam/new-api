import { render } from '@/test/test-utils'

import { NavigationMenu, NavigationMenuList } from './navigation-menu'

describe('NavigationMenu', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <div>Item</div>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(
      container.querySelector('[data-slot="navigation-menu"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <NavigationMenu className='custom-nav'>
        <NavigationMenuList>
          <div>Item</div>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(
      container.querySelector('[data-slot="navigation-menu"]')
    ).toHaveClass('custom-nav')
  })
})

describe('NavigationMenuList', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <div>Item</div>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(
      container.querySelector('[data-slot="navigation-menu-list"]')
    ).toBeInTheDocument()
  })
})

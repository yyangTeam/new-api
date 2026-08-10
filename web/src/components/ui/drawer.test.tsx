import { render, screen } from '@/test/test-utils'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer'

describe('Drawer', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
      </Drawer>
    )
    expect(
      container.querySelector('[data-slot="drawer-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open Drawer</DrawerTrigger>
      </Drawer>
    )
    expect(screen.getByText('Open Drawer')).toBeInTheDocument()
  })
})

describe('DrawerContent', () => {
  test('renders when open', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-content"]')
    ).toBeInTheDocument()
  })
})

describe('DrawerHeader', () => {
  test('renders with data-slot', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>T</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-header"]')
    ).toBeInTheDocument()
  })
})

describe('DrawerFooter', () => {
  test('renders with data-slot', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>T</DrawerTitle>
          </DrawerHeader>
          <DrawerFooter>Footer</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-footer"]')
    ).toBeInTheDocument()
  })
})

describe('DrawerTitle', () => {
  test('renders with data-slot', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-title"]')
    ).toBeInTheDocument()
  })
})

describe('DrawerDescription', () => {
  test('renders with data-slot', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>T</DrawerTitle>
            <DrawerDescription>Desc</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-description"]')
    ).toBeInTheDocument()
  })
})

describe('DrawerClose', () => {
  test('renders with data-slot', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>T</DrawerTitle>
          </DrawerHeader>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>
    )
    expect(
      document.querySelector('[data-slot="drawer-close"]')
    ).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

describe('Sheet', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
      </Sheet>
    )
    expect(
      container.querySelector('[data-slot="sheet-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
      </Sheet>
    )
    expect(screen.getByText('Open Sheet')).toBeInTheDocument()
  })
})

describe('SheetContent', () => {
  test('renders with data-slot when open', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-content"]')
    ).toBeInTheDocument()
  })

  test('renders with default right side', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-side="right"]')
    ).toBeInTheDocument()
  })

  test('renders with left side', () => {
    render(
      <Sheet open>
        <SheetContent side='left'>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-side="left"]')
    ).toBeInTheDocument()
  })

  test('renders with top side', () => {
    render(
      <Sheet open>
        <SheetContent side='top'>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-side="top"]')
    ).toBeInTheDocument()
  })

  test('renders with bottom side', () => {
    render(
      <Sheet open>
        <SheetContent side='bottom'>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-side="bottom"]')
    ).toBeInTheDocument()
  })

  test('shows close button by default', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getAllByText('Close').length).toBeGreaterThanOrEqual(1)
  })

  test('hides close button when showCloseButton is false', () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    const closeButtons = screen.queryAllByText('Close')
    expect(closeButtons).toHaveLength(0)
  })
})

describe('SheetHeader', () => {
  test('renders with data-slot', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-header"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader className='custom-sh'>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-header"]')
    ).toHaveClass('custom-sh')
  })
})

describe('SheetFooter', () => {
  test('renders with data-slot', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
          <SheetFooter>Footer</SheetFooter>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-footer"]')
    ).toBeInTheDocument()
  })
})

describe('SheetTitle', () => {
  test('renders with data-slot', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-title"]')
    ).toBeInTheDocument()
  })
})

describe('SheetDescription', () => {
  test('renders with data-slot', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-description"]')
    ).toBeInTheDocument()
  })
})

describe('SheetClose', () => {
  test('renders with data-slot', () => {
    render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
          </SheetHeader>
          <SheetClose>Close me</SheetClose>
        </SheetContent>
      </Sheet>
    )
    expect(
      document.querySelector('[data-slot="sheet-close"]')
    ).toBeInTheDocument()
  })
})

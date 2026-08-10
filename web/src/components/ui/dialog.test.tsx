import { render, screen } from '@/test/test-utils'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

describe('Dialog', () => {
  test('renders trigger with data-slot', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    )
    expect(screen.getByText('Open')).toHaveAttribute(
      'data-slot',
      'dialog-trigger'
    )
  })

  test('renders open dialog with title', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('My Dialog')).toBeInTheDocument()
  })

  test('DialogHeader renders with data-slot', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-header"]')
    ).toBeInTheDocument()
  })

  test('DialogFooter renders with data-slot', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter>Footer content</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-footer"]')
    ).toBeInTheDocument()
  })

  test('DialogFooter shows close button when showCloseButton is true', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogFooter showCloseButton>Actions</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    // The footer close button renders "Close" text
    const closeButtons = screen.getAllByText('Close')
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  test('DialogTitle renders with data-slot', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-title"]')
    ).toBeInTheDocument()
  })

  test('DialogDescription renders with data-slot', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>Description text</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-description"]')
    ).toBeInTheDocument()
  })

  test('DialogContent shows close button by default', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    // sr-only "Close" text exists for the close button
    const closeButtons = screen.getAllByText('Close')
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  test('DialogContent hides close button when showCloseButton is false', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    const closeButtons = screen.queryAllByText('Close')
    expect(closeButtons).toHaveLength(0)
  })

  test('applies custom className to header', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader className='header-custom'>
            <DialogTitle>T</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-header"]')
    ).toHaveClass('header-custom')
  })

  test('DialogClose renders with data-slot', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogClose>X</DialogClose>
        </DialogContent>
      </Dialog>
    )
    expect(
      document.querySelector('[data-slot="dialog-close"]')
    ).toBeInTheDocument()
  })
})

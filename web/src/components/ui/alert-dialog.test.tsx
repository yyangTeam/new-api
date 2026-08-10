import { render, screen } from '@/test/test-utils'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog'

describe('AlertDialog', () => {
  test('renders trigger button', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
      </AlertDialog>
    )
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  test('trigger has data-slot attribute', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
      </AlertDialog>
    )
    expect(screen.getByText('Open')).toHaveAttribute(
      'data-slot',
      'alert-dialog-trigger'
    )
  })

  test('AlertDialogHeader renders with data-slot', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-header"]')
    ).toBeInTheDocument()
  })

  test('AlertDialogFooter renders with data-slot', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-footer"]')
    ).toBeInTheDocument()
  })

  test('AlertDialogMedia renders with data-slot', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>Icon</AlertDialogMedia>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-media"]')
    ).toBeInTheDocument()
  })

  test('AlertDialogTitle renders text', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>My Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  test('AlertDialogDescription renders text', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>My description</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(screen.getByText('My description')).toBeInTheDocument()
  })

  test('AlertDialogAction renders button with data-slot', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-action"]')
    ).toBeInTheDocument()
  })

  test('AlertDialogCancel renders with data-slot', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-cancel"]')
    ).toBeInTheDocument()
  })

  test('AlertDialogContent supports size prop', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Small</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-size="sm"]')
    ).toBeInTheDocument()
  })

  test('applies custom className to header', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader className='custom-header'>
            <AlertDialogTitle>T</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-header"]')
    ).toHaveClass('custom-header')
  })

  test('applies custom className to footer', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogFooter className='custom-footer'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(
      document.querySelector('[data-slot="alert-dialog-footer"]')
    ).toHaveClass('custom-footer')
  })
})

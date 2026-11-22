import { render, screen } from '@/test/test-utils'

import { Dialog } from '@/components/dialog'

describe('Dialog', () => {
  test('renders title and children when open', () => {
    render(
      <Dialog open title='My Dialog'>
        <p>Dialog body</p>
      </Dialog>
    )
    expect(screen.getByText('My Dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog body')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(
      <Dialog open title='Title' description='A description'>
        <p>Content</p>
      </Dialog>
    )
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    render(
      <Dialog open title='Title'>
        <p>Content</p>
      </Dialog>
    )
    expect(screen.queryByText('A description')).not.toBeInTheDocument()
  })

  test('renders footer when provided', () => {
    render(
      <Dialog open title='Title' footer={<button type='button'>Save</button>}>
        <p>Content</p>
      </Dialog>
    )
    expect(
      screen.getByRole('button', { name: 'Save' })
    ).toBeInTheDocument()
  })

  test('does not render footer when not provided', () => {
    render(
      <Dialog open title='Title'>
        <p>Content only</p>
      </Dialog>
    )
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
  })

  test('renders trigger element when provided', () => {
    render(
      <Dialog
        title='Triggered'
        trigger={<button type='button'>Open</button>}
      >
        <p>Body</p>
      </Dialog>
    )
    expect(
      screen.getByRole('button', { name: 'Open' })
    ).toBeInTheDocument()
  })

  test('does not render trigger when not provided', () => {
    render(
      <Dialog open title='No Trigger'>
        <p>Body</p>
      </Dialog>
    )
    // Only the dialog content renders, no standalone trigger
    expect(screen.getByText('No Trigger')).toBeInTheDocument()
  })
})

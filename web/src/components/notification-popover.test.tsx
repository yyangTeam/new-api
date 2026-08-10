import { render, screen } from '@/test/test-utils'

import { NotificationPopover } from './notification-popover'

describe('NotificationPopover', () => {
  test('renders bell button', () => {
    render(<NotificationPopover announcements={[]} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  test('renders with empty announcements', () => {
    const { container } = render(
      <NotificationPopover announcements={[]} />
    )
    expect(container.firstElementChild).toBeInTheDocument()
  })

  test('renders without crashing with announcements', () => {
    const announcements = [
      { id: 1, content: 'Test announcement', type: 'info' },
      { id: 2, content: 'Another one', type: 'warning' },
    ]
    const { container } = render(
      <NotificationPopover announcements={announcements} />
    )
    expect(container.firstElementChild).toBeInTheDocument()
  })
})

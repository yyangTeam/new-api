import { render, screen, userEvent } from '@/test/test-utils'

import { NotificationPopover } from '@/components/notification-popover'

describe('NotificationPopover', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    unreadCount: 0,
    activeTab: 'notice' as const,
    onTabChange: vi.fn(),
    notice: '',
    announcements: [],
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders bell button with aria-label', () => {
    render(<NotificationPopover {...defaultProps} open={false} />)
    expect(
      screen.getByRole('button', { name: 'Notifications' })
    ).toBeInTheDocument()
  })

  test('shows unread count badge when unreadCount > 0', () => {
    render(
      <NotificationPopover {...defaultProps} open={false} unreadCount={5} />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  test('shows 99+ when unreadCount > 99', () => {
    render(
      <NotificationPopover {...defaultProps} open={false} unreadCount={100} />
    )
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  test('does not show badge when unreadCount is 0', () => {
    const { container } = render(
      <NotificationPopover {...defaultProps} open={false} unreadCount={0} />
    )
    // No destructive badge variant should exist
    expect(container.querySelector('[data-slot="badge"]')).not.toBeInTheDocument()
  })

  test('renders empty notice state when notice is empty', () => {
    render(<NotificationPopover {...defaultProps} />)
    expect(
      screen.getByText('No announcements at this time')
    ).toBeInTheDocument()
  })

  test('renders loading state for notice tab', () => {
    render(<NotificationPopover {...defaultProps} loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders notice content when notice is provided', () => {
    render(
      <NotificationPopover
        {...defaultProps}
        notice='Welcome to the platform!'
      />
    )
    expect(screen.getByText('Welcome to the platform!')).toBeInTheDocument()
  })

  test('renders System Announcements title', () => {
    render(<NotificationPopover {...defaultProps} />)
    expect(screen.getByText('System Announcements')).toBeInTheDocument()
  })

  test('renders Notice and Timeline tabs', () => {
    render(<NotificationPopover {...defaultProps} />)
    expect(screen.getByText('Notice')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  test('renders close button', () => {
    render(<NotificationPopover {...defaultProps} />)
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  test('calls onOpenChange(false) when close button clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <NotificationPopover {...defaultProps} onOpenChange={onOpenChange} />
    )

    await user.click(screen.getByText('Close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('renders empty announcements state', () => {
    render(
      <NotificationPopover
        {...defaultProps}
        activeTab='announcements'
        announcements={[]}
      />
    )
    expect(screen.getByText('No system announcements')).toBeInTheDocument()
  })

  test('renders loading state for announcements tab', () => {
    render(
      <NotificationPopover
        {...defaultProps}
        activeTab='announcements'
        loading={true}
      />
    )
    // There should be a loading indicator
    const loadings = screen.getAllByText('Loading...')
    expect(loadings.length).toBeGreaterThanOrEqual(1)
  })

  test('renders announcements with content', () => {
    const announcements = [
      {
        id: 1,
        content: 'System maintenance tonight',
        type: 'warning',
        publishDate: new Date().toISOString(),
      },
      {
        id: 2,
        content: 'New feature released',
        type: 'info',
        extra: 'Check out the docs',
      },
    ]
    render(
      <NotificationPopover
        {...defaultProps}
        activeTab='announcements'
        announcements={announcements}
      />
    )
    expect(
      screen.getByText('System maintenance tonight')
    ).toBeInTheDocument()
    expect(screen.getByText('New feature released')).toBeInTheDocument()
    expect(screen.getByText('Check out the docs')).toBeInTheDocument()
  })

  test('renders announcements without id using content-based key', () => {
    const announcements = [
      { content: 'No id announcement', type: 'info' },
    ]
    render(
      <NotificationPopover
        {...defaultProps}
        activeTab='announcements'
        announcements={announcements}
      />
    )
    expect(screen.getByText('No id announcement')).toBeInTheDocument()
  })

  test('renders recent announcement with relative time "Just now"', () => {
    const announcements = [
      {
        id: 1,
        content: 'Just posted',
        publishDate: new Date().toISOString(),
      },
    ]
    render(
      <NotificationPopover
        {...defaultProps}
        activeTab='announcements'
        announcements={announcements}
      />
    )
    expect(screen.getByText('Just posted')).toBeInTheDocument()
    expect(screen.getByText(/Just now/)).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <NotificationPopover
        {...defaultProps}
        open={false}
        className='custom-notif'
      />
    )
    expect(container.querySelector('.custom-notif')).toBeInTheDocument()
  })
})

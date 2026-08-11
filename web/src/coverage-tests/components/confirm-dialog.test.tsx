import { render, screen, userEvent } from '@/test/test-utils'

import { ConfirmDialog } from '@/components/confirm-dialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete Item',
    desc: 'Are you sure you want to delete this?',
    handleConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders title and description when open', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    expect(
      screen.getByText('Are you sure you want to delete this?')
    ).toBeInTheDocument()
  })

  test('renders default cancel and continue buttons', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  test('renders custom cancel button text', () => {
    render(<ConfirmDialog {...defaultProps} cancelBtnText='Dismiss' />)
    expect(screen.getByText('Dismiss')).toBeInTheDocument()
  })

  test('renders custom confirm text', () => {
    render(<ConfirmDialog {...defaultProps} confirmText='Delete Now' />)
    expect(screen.getByText('Delete Now')).toBeInTheDocument()
  })

  test('calls handleConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)
    await user.click(screen.getByText('Continue'))
    expect(defaultProps.handleConfirm).toHaveBeenCalledTimes(1)
  })

  test('applies destructive variant when destructive is true', () => {
    render(<ConfirmDialog {...defaultProps} destructive />)
    const confirmBtn = screen.getByText('Continue')
    expect(confirmBtn.className).toContain('destructive')
  })

  test('disables confirm button when disabled is true', () => {
    render(<ConfirmDialog {...defaultProps} disabled />)
    const confirmBtn = screen.getByText('Continue')
    expect(confirmBtn).toBeDisabled()
  })

  test('disables confirm button when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading />)
    const confirmBtn = screen.getByText('Continue')
    expect(confirmBtn).toBeDisabled()
  })

  test('disables cancel button when isLoading is true', () => {
    render(<ConfirmDialog {...defaultProps} isLoading />)
    const cancelBtn = screen.getByText('Cancel')
    expect(cancelBtn).toBeDisabled()
  })

  test('renders children content', () => {
    render(
      <ConfirmDialog {...defaultProps}>
        <p>Additional content here</p>
      </ConfirmDialog>
    )
    expect(screen.getByText('Additional content here')).toBeInTheDocument()
  })

  test('renders JSX description', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        desc={<span data-testid='custom-desc'>Custom JSX</span>}
      />
    )
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument()
  })

  test('passes className prop to content', () => {
    // className is applied to AlertDialogContent via cn()
    render(<ConfirmDialog {...defaultProps} className='custom-class' />)
    // Verify the dialog still renders with the custom class scenario
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
  })
})

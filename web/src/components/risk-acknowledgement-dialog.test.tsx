import { render, screen, userEvent, waitFor } from '@/test/test-utils'

import { RiskAcknowledgementDialog } from './risk-acknowledgement-dialog'

describe('RiskAcknowledgementDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Dangerous Action',
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders title', () => {
    render(<RiskAcknowledgementDialog {...defaultProps} />)
    expect(screen.getByText('Dangerous Action')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        description='This action cannot be undone.'
      />
    )
    expect(
      screen.getByText('This action cannot be undone.')
    ).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    render(<RiskAcknowledgementDialog {...defaultProps} />)
    expect(
      screen.queryByText('This action cannot be undone.')
    ).not.toBeInTheDocument()
  })

  test('renders items as ordered list', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        items={['Step 1', 'Step 2']}
      />
    )
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  test('renders checklist items', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        checklist={['I understand the risks', 'I accept responsibility']}
      />
    )
    expect(screen.getByText('I understand the risks')).toBeInTheDocument()
    expect(screen.getByText('I accept responsibility')).toBeInTheDocument()
  })

  test('confirm button is disabled until all checklist items are checked', async () => {
    const user = userEvent.setup()
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        checklist={['Check 1', 'Check 2']}
      />
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeDisabled()

    // Check first checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(confirmBtn).toBeDisabled()

    // Check second checkbox
    await user.click(checkboxes[1])
    expect(confirmBtn).not.toBeDisabled()
  })

  test('confirm button is disabled until required text matches', async () => {
    const user = userEvent.setup()
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        requiredText='DELETE'
      />
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeDisabled()

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'DELETE')

    await waitFor(() => {
      expect(confirmBtn).not.toBeDisabled()
    })
  })

  test('shows mismatch hint when typed text does not match', async () => {
    const user = userEvent.setup()
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        requiredText='CONFIRM'
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'wrong')

    expect(
      screen.getByText(
        'The entered text does not match the required text.'
      )
    ).toBeInTheDocument()
  })

  test('shows custom mismatch hint', async () => {
    const user = userEvent.setup()
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        requiredText='CONFIRM'
        mismatchHint='Text must match exactly!'
      />
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'wrong')

    expect(screen.getByText('Text must match exactly!')).toBeInTheDocument()
  })

  test('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        onConfirm={onConfirm}
      />
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    await user.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('renders custom confirm text', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        confirmText='Delete Forever'
      />
    )
    expect(
      screen.getByRole('button', { name: 'Delete Forever' })
    ).toBeInTheDocument()
  })

  test('renders custom cancel text', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        cancelText='Go Back'
      />
    )
    expect(screen.getByText('Go Back')).toBeInTheDocument()
  })

  test('renders default confirm and cancel text', () => {
    render(<RiskAcknowledgementDialog {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: 'Confirm' })
    ).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  test('disables cancel button when isLoading', () => {
    render(
      <RiskAcknowledgementDialog {...defaultProps} isLoading />
    )
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  test('renders custom input prompt', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        requiredText='DELETE'
        inputPrompt='Type DELETE to proceed:'
      />
    )
    expect(screen.getByText('Type DELETE to proceed:')).toBeInTheDocument()
  })

  test('renders required text display block', () => {
    render(
      <RiskAcknowledgementDialog
        {...defaultProps}
        requiredText='CONFIRM-DELETE'
      />
    )
    expect(screen.getByText('CONFIRM-DELETE')).toBeInTheDocument()
  })

  test('enables confirm when no checklist and no required text', () => {
    render(<RiskAcknowledgementDialog {...defaultProps} />)
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).not.toBeDisabled()
  })
})

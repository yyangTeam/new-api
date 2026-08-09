import { render, screen, userEvent } from '@/test/test-utils'

import { StepNavigation } from './step-navigation'

describe('StepNavigation', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 4,
    onBack: vi.fn(),
    onNext: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('hides Back button on first step', () => {
    render(<StepNavigation {...defaultProps} currentStep={0} />)
    expect(
      screen.queryByRole('button', { name: 'Back' })
    ).not.toBeInTheDocument()
  })

  test('shows Next button on non-last steps', () => {
    render(<StepNavigation {...defaultProps} currentStep={1} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  test('shows Back button on non-first steps', () => {
    render(<StepNavigation {...defaultProps} currentStep={2} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  test('shows Initialize system button on last step', () => {
    render(<StepNavigation {...defaultProps} currentStep={3} />)
    expect(
      screen.getByRole('button', { name: /Initialize system/ })
    ).toBeInTheDocument()
  })

  test('hides Next button on last step', () => {
    render(<StepNavigation {...defaultProps} currentStep={3} />)
    expect(
      screen.queryByRole('button', { name: 'Next' })
    ).not.toBeInTheDocument()
  })

  test('calls onNext when Next button is clicked', async () => {
    const user = userEvent.setup()
    render(<StepNavigation {...defaultProps} currentStep={1} />)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1)
  })

  test('calls onBack when Back button is clicked', async () => {
    const user = userEvent.setup()
    render(<StepNavigation {...defaultProps} currentStep={2} />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1)
  })

  test('calls onSubmit when Initialize system button is clicked', async () => {
    const user = userEvent.setup()
    render(<StepNavigation {...defaultProps} currentStep={3} />)
    await user.click(
      screen.getByRole('button', { name: /Initialize system/ })
    )
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
  })

  test('disables submit button when isSubmitting is true', () => {
    render(
      <StepNavigation {...defaultProps} currentStep={3} isSubmitting={true} />
    )
    const submitButton = screen.getByRole('button', { name: /Initializing/ })
    expect(submitButton).toBeDisabled()
  })

  test('shows Initializing text when isSubmitting is true', () => {
    render(
      <StepNavigation {...defaultProps} currentStep={3} isSubmitting={true} />
    )
    expect(screen.getByText(/Initializing/)).toBeInTheDocument()
  })
})

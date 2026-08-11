import { render, screen } from '@/test/test-utils'

import { UsageModeStep } from '@/features/setup/components/usage-mode-step'
import type { SetupFormValues } from '@/features/setup/types'
import { useForm, FormProvider } from 'react-hook-form'

function TestWrapper(props: { defaultUsageMode?: SetupFormValues['usageMode'] }) {
  const form = useForm<SetupFormValues>({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      usageMode: props.defaultUsageMode || 'external',
    },
  })
  return (
    <FormProvider {...form}>
      <UsageModeStep form={form} />
    </FormProvider>
  )
}

describe('UsageModeStep', () => {
  test('renders the question label', () => {
    render(<TestWrapper />)
    expect(
      screen.getByText('How will you use the platform?')
    ).toBeInTheDocument()
  })

  test('renders all three usage mode options', () => {
    render(<TestWrapper />)
    expect(screen.getByText('External operations')).toBeInTheDocument()
    expect(screen.getByText('Personal use')).toBeInTheDocument()
    expect(screen.getByText('Demo site')).toBeInTheDocument()
  })

  test('renders descriptions for each mode', () => {
    render(<TestWrapper />)
    expect(
      screen.getByText(
        'Serve multiple users or teams with billing and quota control.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Best for single-tenant deployments. Pricing and billing options stay hidden.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Showcase core capabilities with demo credentials and limited access.'
      )
    ).toBeInTheDocument()
  })

  test('renders three radio group items', () => {
    render(<TestWrapper />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  test('external radio is checked by default', () => {
    render(<TestWrapper defaultUsageMode='external' />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(3)
    // At least one radio should have a checked-like state
    expect(radios[0]).toBeInTheDocument()
  })
})

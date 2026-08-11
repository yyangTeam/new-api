import { render, screen } from '@/test/test-utils'

import { AdminStep } from '@/features/setup/components/admin-step'
import type { SetupFormValues } from '@/features/setup/types'
import { useForm, FormProvider } from 'react-hook-form'

function TestWrapper(props: { rootInitialized?: boolean }) {
  const form = useForm<SetupFormValues>({
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      usageMode: 'external',
    },
  })
  return (
    <FormProvider {...form}>
      <AdminStep form={form} rootInitialized={props.rootInitialized} />
    </FormProvider>
  )
}

describe('AdminStep', () => {
  test('shows alert when root is already initialized', () => {
    render(<TestWrapper rootInitialized={true} />)
    expect(
      screen.getByText(
        'The administrator account is already initialized. You can keep your existing credentials and continue to the next step.'
      )
    ).toBeInTheDocument()
  })

  test('does not show form fields when root is initialized', () => {
    render(<TestWrapper rootInitialized={true} />)
    expect(
      screen.queryByText('Administrator username')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Password')).not.toBeInTheDocument()
  })

  test('shows form fields when root is not initialized', () => {
    render(<TestWrapper rootInitialized={false} />)
    expect(screen.getByText('Administrator username')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm password')).toBeInTheDocument()
  })

  test('shows form fields when rootInitialized is undefined', () => {
    render(<TestWrapper />)
    expect(screen.getByText('Administrator username')).toBeInTheDocument()
  })

  test('renders username input with correct placeholder', () => {
    render(<TestWrapper rootInitialized={false} />)
    expect(
      screen.getByPlaceholderText('Choose a username')
    ).toBeInTheDocument()
  })

  test('renders password input with correct placeholder', () => {
    render(<TestWrapper rootInitialized={false} />)
    expect(
      screen.getByPlaceholderText('Set a secure password (min. 8 characters)')
    ).toBeInTheDocument()
  })

  test('renders confirm password input with correct placeholder', () => {
    render(<TestWrapper rootInitialized={false} />)
    expect(
      screen.getByPlaceholderText('Repeat the administrator password')
    ).toBeInTheDocument()
  })
})

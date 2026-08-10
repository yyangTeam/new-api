import { render, screen, userEvent, waitFor } from '@/test/test-utils'
import { useForm } from 'react-hook-form'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'
import { Input } from './input'

function TestForm({
  onSubmit = vi.fn(),
  defaultValues = { username: '' },
}: {
  onSubmit?: (data: { username: string }) => void
  defaultValues?: { username: string }
}) {
  const form = useForm({ defaultValues })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} data-testid='test-form'>
        <FormField
          control={form.control}
          name='username'
          rules={{ required: 'Username is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder='Enter username' {...field} />
              </FormControl>
              <FormDescription>Your public display name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type='submit'>Submit</button>
      </form>
    </Form>
  )
}

describe('FormItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FormItem>Content</FormItem>)
    expect(
      container.querySelector('[data-slot="form-item"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <FormItem className='custom-fi'>Content</FormItem>
    )
    expect(
      container.querySelector('[data-slot="form-item"]')
    ).toHaveClass('custom-fi')
  })
})

describe('Form integration', () => {
  test('renders form with all sub-components', () => {
    render(<TestForm />)
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
    expect(screen.getByText('Your public display name')).toBeInTheDocument()
  })

  test('label has correct htmlFor linked to input', () => {
    render(<TestForm />)
    const label = screen.getByText('Username')
    const input = screen.getByPlaceholderText('Enter username')
    const htmlFor = label.getAttribute('for')
    expect(htmlFor).toBeTruthy()
    expect(input.getAttribute('id')).toBe(htmlFor)
  })

  test('input has aria-describedby for description', () => {
    render(<TestForm />)
    const input = screen.getByPlaceholderText('Enter username')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
  })

  test('shows validation error when submitted empty', async () => {
    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument()
    })
  })

  test('sets aria-invalid on input when error occurs', async () => {
    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByText('Submit'))

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter username')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  test('sets data-error on label when error occurs', async () => {
    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByText('Submit'))

    await waitFor(() => {
      const label = screen.getByText('Username')
      expect(label).toHaveAttribute('data-error', 'true')
    })
  })

  test('calls onSubmit with form data when valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('Enter username'), 'john')
    await user.click(screen.getByText('Submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { username: 'john' },
        expect.anything()
      )
    })
  })

  test('FormMessage renders nothing when no error and no children', () => {
    function NoErrorForm() {
      const f = useForm({ defaultValues: { test: '' } })
      return (
        <Form {...f}>
          <FormField
            control={f.control}
            name='test'
            render={() => (
              <FormItem>
                <FormMessage data-testid='msg' />
              </FormItem>
            )}
          />
        </Form>
      )
    }
    const { container } = render(<NoErrorForm />)
    expect(
      container.querySelector('[data-slot="form-message"]')
    ).not.toBeInTheDocument()
  })
})

describe('FormDescription', () => {
  test('renders with data-slot', () => {
    function DescForm() {
      const f = useForm({ defaultValues: { name: '' } })
      return (
        <Form {...f}>
          <FormField
            control={f.control}
            name='name'
            render={() => (
              <FormItem>
                <FormDescription className='desc-custom'>
                  Help text
                </FormDescription>
              </FormItem>
            )}
          />
        </Form>
      )
    }
    const { container } = render(<DescForm />)
    const desc = container.querySelector('[data-slot="form-description"]')
    expect(desc).toBeInTheDocument()
    expect(desc).toHaveClass('desc-custom')
    expect(screen.getByText('Help text')).toBeInTheDocument()
  })
})

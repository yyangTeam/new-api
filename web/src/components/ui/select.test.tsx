import { render, screen } from '@/test/test-utils'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'

vi.mock('@/hooks', () => ({
  useMediaQuery: vi.fn(() => false),
}))

describe('Select', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder='Pick one' />
        </SelectTrigger>
      </Select>
    )
    expect(
      container.querySelector('[data-slot="select-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders with default size', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder='Pick one' />
        </SelectTrigger>
      </Select>
    )
    expect(
      container.querySelector('[data-size="default"]')
    ).toBeInTheDocument()
  })

  test('renders with sm size', () => {
    const { container } = render(
      <Select>
        <SelectTrigger size='sm'>
          <SelectValue placeholder='Pick one' />
        </SelectTrigger>
      </Select>
    )
    expect(
      container.querySelector('[data-size="sm"]')
    ).toBeInTheDocument()
  })

  test('renders placeholder in value', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder='Pick one' />
        </SelectTrigger>
      </Select>
    )
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })

  test('applies custom className to trigger', () => {
    const { container } = render(
      <Select>
        <SelectTrigger className='custom-trig'>
          <SelectValue placeholder='Pick' />
        </SelectTrigger>
      </Select>
    )
    expect(
      container.querySelector('[data-slot="select-trigger"]')
    ).toHaveClass('custom-trig')
  })
})

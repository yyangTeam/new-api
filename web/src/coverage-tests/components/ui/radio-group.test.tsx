import { render } from '@/test/test-utils'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

describe('RadioGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value='a' />
        <RadioGroupItem value='b' />
      </RadioGroup>
    )
    expect(
      container.querySelector('[data-slot="radio-group"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <RadioGroup className='custom-rg'>
        <RadioGroupItem value='a' />
      </RadioGroup>
    )
    expect(
      container.querySelector('[data-slot="radio-group"]')
    ).toHaveClass('custom-rg')
  })
})

describe('RadioGroupItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value='a' />
      </RadioGroup>
    )
    expect(
      container.querySelector('[data-slot="radio-group-item"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value='a' className='custom-item' />
      </RadioGroup>
    )
    expect(
      container.querySelector('[data-slot="radio-group-item"]')
    ).toHaveClass('custom-item')
  })

  test('renders indicator inside item', () => {
    const { container } = render(
      <RadioGroup defaultValue='a'>
        <RadioGroupItem value='a' />
      </RadioGroup>
    )
    expect(
      container.querySelector('[data-slot="radio-group-indicator"]')
    ).toBeInTheDocument()
  })

  test('renders multiple items', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value='a' />
        <RadioGroupItem value='b' />
        <RadioGroupItem value='c' />
      </RadioGroup>
    )
    const items = container.querySelectorAll('[data-slot="radio-group-item"]')
    expect(items).toHaveLength(3)
  })
})

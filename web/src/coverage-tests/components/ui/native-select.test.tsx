import { render, screen } from '@/test/test-utils'

import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from '@/components/ui/native-select'

describe('NativeSelect', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select"]')
    ).toBeInTheDocument()
  })

  test('renders with default size', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-size="default"]')
    ).toBeInTheDocument()
  })

  test('renders with sm size', () => {
    const { container } = render(
      <NativeSelect size='sm'>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-size="sm"]')
    ).toBeInTheDocument()
  })

  test('renders wrapper with data-slot', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select-wrapper"]')
    ).toBeInTheDocument()
  })

  test('renders icon with aria-hidden', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select-icon"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <NativeSelect className='custom-ns'>
        <NativeSelectOption value='a'>A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select-wrapper"]')
    ).toHaveClass('custom-ns')
  })
})

describe('NativeSelectOption', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOption value='a'>Option A</NativeSelectOption>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select-option"]')
    ).toBeInTheDocument()
  })

  test('renders option text', () => {
    render(
      <NativeSelect>
        <NativeSelectOption value='a'>Option A</NativeSelectOption>
      </NativeSelect>
    )
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })
})

describe('NativeSelectOptGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <NativeSelect>
        <NativeSelectOptGroup label='Group 1'>
          <NativeSelectOption value='a'>A</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    )
    expect(
      container.querySelector('[data-slot="native-select-optgroup"]')
    ).toBeInTheDocument()
  })
})

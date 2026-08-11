import { render, screen } from '@/test/test-utils'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'

describe('InputGroup', () => {
  test('renders with data-slot and role=group', () => {
    render(
      <InputGroup>
        <InputGroupInput placeholder='Type here' />
      </InputGroup>
    )
    expect(screen.getByRole('group')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <InputGroup className='custom-ig'>
        <InputGroupInput />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-slot="input-group"]')
    ).toHaveClass('custom-ig')
  })
})

describe('InputGroupAddon', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>$</InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-slot="input-group-addon"]')
    ).toBeInTheDocument()
  })

  test('renders with default inline-start align', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>$</InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-align="inline-start"]')
    ).toBeInTheDocument()
  })

  test('renders with inline-end align', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align='inline-end'>%</InputGroupAddon>
      </InputGroup>
    )
    expect(
      container.querySelector('[data-align="inline-end"]')
    ).toBeInTheDocument()
  })

  test('renders with block-start align', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon align='block-start'>Header</InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-align="block-start"]')
    ).toBeInTheDocument()
  })

  test('renders with block-end align', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align='block-end'>Footer</InputGroupAddon>
      </InputGroup>
    )
    expect(
      container.querySelector('[data-align="block-end"]')
    ).toBeInTheDocument()
  })
})

describe('InputGroupButton', () => {
  test('renders button with default type=button', () => {
    render(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton>Go</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    )
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toHaveAttribute('type', 'button')
  })
})

describe('InputGroupInput', () => {
  test('renders input with data-slot', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput placeholder='Enter value' />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-slot="input-group-control"]')
    ).toBeInTheDocument()
  })
})

describe('InputGroupText', () => {
  test('renders text content', () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Label</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput />
      </InputGroup>
    )
    expect(screen.getByText('Label')).toBeInTheDocument()
  })
})

describe('InputGroupTextarea', () => {
  test('renders textarea with data-slot', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupTextarea placeholder='Type long text' />
      </InputGroup>
    )
    expect(
      container.querySelector('[data-slot="input-group-control"]')
    ).toBeInTheDocument()
  })
})

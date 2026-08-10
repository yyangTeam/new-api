import { render, screen } from '@/test/test-utils'

import { Button } from './button'
import { ButtonGroup, ButtonGroupSeparator } from './button-group'

describe('ButtonGroup', () => {
  test('renders with role=group', () => {
    render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>
    )
    expect(screen.getByRole('group')).toBeInTheDocument()
  })

  test('renders with data-slot', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    )
    expect(
      container.querySelector('[data-slot="button-group"]')
    ).toBeInTheDocument()
  })

  test('applies horizontal orientation by default', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
      </ButtonGroup>
    )
    // Default orientation is horizontal; the group renders without data-orientation for default
    const group = container.querySelector('[data-slot="button-group"]')
    expect(group).toBeInTheDocument()
  })

  test('applies vertical orientation', () => {
    const { container } = render(
      <ButtonGroup orientation='vertical'>
        <Button>A</Button>
      </ButtonGroup>
    )
    const group = container.querySelector('[data-slot="button-group"]')
    expect(group).toHaveAttribute('data-orientation', 'vertical')
  })

  test('applies custom className', () => {
    const { container } = render(
      <ButtonGroup className='custom-bg'>
        <Button>A</Button>
      </ButtonGroup>
    )
    expect(
      container.querySelector('[data-slot="button-group"]')
    ).toHaveClass('custom-bg')
  })

  test('renders children buttons', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>
    )
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })
})

describe('ButtonGroupSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
        <ButtonGroupSeparator />
        <Button>B</Button>
      </ButtonGroup>
    )
    expect(
      container.querySelector('[data-slot="button-group-separator"]')
    ).toBeInTheDocument()
  })
})

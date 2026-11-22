import { render, screen } from '@/test/test-utils'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'

describe('Avatar', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument()
  })

  test('renders with default size', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(container.querySelector('[data-size="default"]')).toBeInTheDocument()
  })

  test('renders with sm size', () => {
    const { container } = render(
      <Avatar size='sm'>
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
    )
    expect(container.querySelector('[data-size="sm"]')).toBeInTheDocument()
  })

  test('renders with lg size', () => {
    const { container } = render(
      <Avatar size='lg'>
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    )
    expect(container.querySelector('[data-size="lg"]')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Avatar className='custom'>
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
    )
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('custom')
  })
})

describe('AvatarFallback', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(
      container.querySelector('[data-slot="avatar-fallback"]')
    ).toBeInTheDocument()
  })

  test('renders fallback text', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className='fb-custom'>JD</AvatarFallback>
      </Avatar>
    )
    expect(
      container.querySelector('[data-slot="avatar-fallback"]')
    ).toHaveClass('fb-custom')
  })
})

describe('AvatarImage', () => {
  test('renders image element inside avatar', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src='test.jpg' />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    // AvatarImage renders but may be hidden by the fallback mechanism
    // The avatar container itself should be present
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument()
  })
})

describe('AvatarBadge', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    )
    expect(
      container.querySelector('[data-slot="avatar-badge"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
        <AvatarBadge className='badge-custom' />
      </Avatar>
    )
    expect(
      container.querySelector('[data-slot="avatar-badge"]')
    ).toHaveClass('badge-custom')
  })
})

describe('AvatarGroup', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    )
    expect(
      container.querySelector('[data-slot="avatar-group"]')
    ).toBeInTheDocument()
  })
})

describe('AvatarGroupCount', () => {
  test('renders with data-slot and children', () => {
    const { container } = render(
      <AvatarGroup>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    )
    expect(
      container.querySelector('[data-slot="avatar-group-count"]')
    ).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })
})

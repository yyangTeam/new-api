import { render, screen } from '@/test/test-utils'

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover'

describe('Popover', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
      </Popover>
    )
    expect(
      container.querySelector('[data-slot="popover-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
      </Popover>
    )
    expect(screen.getByText('Open popover')).toBeInTheDocument()
  })
})

describe('PopoverHeader', () => {
  test('renders with data-slot when open', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Title</PopoverTitle>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    )
    expect(
      document.querySelector('[data-slot="popover-header"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader className='custom-ph'>
            <PopoverTitle>T</PopoverTitle>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    )
    expect(
      document.querySelector('[data-slot="popover-header"]')
    ).toHaveClass('custom-ph')
  })
})

describe('PopoverTitle', () => {
  test('renders with data-slot', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>My Title</PopoverTitle>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    )
    expect(
      document.querySelector('[data-slot="popover-title"]')
    ).toBeInTheDocument()
  })
})

describe('PopoverDescription', () => {
  test('renders with data-slot', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>T</PopoverTitle>
            <PopoverDescription>Desc</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    )
    expect(
      document.querySelector('[data-slot="popover-description"]')
    ).toBeInTheDocument()
  })
})

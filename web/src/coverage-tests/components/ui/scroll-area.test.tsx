import { render, screen } from '@/test/test-utils'

import { ScrollArea } from '@/components/ui/scroll-area'

describe('ScrollArea', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    )
    expect(
      container.querySelector('[data-slot="scroll-area"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(
      <ScrollArea>
        <div>Scrollable content</div>
      </ScrollArea>
    )
    expect(screen.getByText('Scrollable content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ScrollArea className='custom-sa'>
        <div>C</div>
      </ScrollArea>
    )
    expect(
      container.querySelector('[data-slot="scroll-area"]')
    ).toHaveClass('custom-sa')
  })

  test('renders viewport', () => {
    const { container } = render(
      <ScrollArea>
        <div>C</div>
      </ScrollArea>
    )
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')
    ).toBeInTheDocument()
  })
})

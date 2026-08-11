import { render, screen } from '@/test/test-utils'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

describe('HoverCard', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
      </HoverCard>
    )
    expect(
      container.querySelector('[data-slot="hover-card-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover text</HoverCardTrigger>
      </HoverCard>
    )
    expect(screen.getByText('Hover text')).toBeInTheDocument()
  })
})

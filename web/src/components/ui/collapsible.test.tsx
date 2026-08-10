import { render, screen } from '@/test/test-utils'

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'

describe('Collapsible', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )
    expect(
      container.querySelector('[data-slot="collapsible"]')
    ).toBeInTheDocument()
  })

  test('renders trigger with data-slot', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )
    expect(
      container.querySelector('[data-slot="collapsible-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle me</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByText('Toggle me')).toBeInTheDocument()
  })

  test('renders content with data-slot when open', () => {
    const { container } = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Visible content</CollapsibleContent>
      </Collapsible>
    )
    expect(
      container.querySelector('[data-slot="collapsible-content"]')
    ).toBeInTheDocument()
  })
})

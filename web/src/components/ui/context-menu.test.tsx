import { render, screen } from '@/test/test-utils'

import { ContextMenu, ContextMenuTrigger } from './context-menu'

describe('ContextMenu', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger>Right click me</ContextMenuTrigger>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Context target</ContextMenuTrigger>
      </ContextMenu>
    )
    expect(screen.getByText('Context target')).toBeInTheDocument()
  })

  test('applies custom className to trigger', () => {
    const { container } = render(
      <ContextMenu>
        <ContextMenuTrigger className='custom-trigger'>Target</ContextMenuTrigger>
      </ContextMenu>
    )
    expect(
      container.querySelector('[data-slot="context-menu-trigger"]')
    ).toHaveClass('custom-trigger')
  })
})

import { render } from '@/test/test-utils'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

describe('ResizablePanelGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(
      container.querySelector('[data-slot="resizable-panel-group"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal' className='custom-rpg'>
        <ResizablePanel>P1</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(
      container.querySelector('[data-slot="resizable-panel-group"]')
    ).toHaveClass('custom-rpg')
  })
})

describe('ResizablePanel', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel>Content</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(
      container.querySelector('[data-slot="resizable-panel"]')
    ).toBeInTheDocument()
  })
})

describe('ResizableHandle', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel>P1</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>P2</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(
      container.querySelector('[data-slot="resizable-handle"]')
    ).toBeInTheDocument()
  })

  test('renders handle element when withHandle is true', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel>P1</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>P2</ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = container.querySelector('[data-slot="resizable-handle"]')
    expect(handle?.querySelector('div')).toBeInTheDocument()
  })

  test('does not render handle element by default', () => {
    const { container } = render(
      <ResizablePanelGroup direction='horizontal'>
        <ResizablePanel>P1</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>P2</ResizablePanel>
      </ResizablePanelGroup>
    )
    const handle = container.querySelector('[data-slot="resizable-handle"]')
    expect(handle?.querySelector('div')).not.toBeInTheDocument()
  })
})

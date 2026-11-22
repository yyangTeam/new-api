import { render, screen } from '@/test/test-utils'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

describe('TooltipProvider', () => {
  test('renders children', () => {
    render(
      <TooltipProvider>
        <div>Content</div>
      </TooltipProvider>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('Tooltip', () => {
  test('renders trigger with data-slot', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(
      container.querySelector('[data-slot="tooltip-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })
})

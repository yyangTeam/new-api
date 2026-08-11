import { render } from '@/test/test-utils'

import { DirectionProvider } from '@/components/ui/direction'

describe('DirectionProvider', () => {
  test('renders children', () => {
    const { container } = render(
      <DirectionProvider direction='ltr'>
        <div>Content</div>
      </DirectionProvider>
    )
    expect(container.textContent).toBe('Content')
  })

  test('renders with rtl direction', () => {
    const { container } = render(
      <DirectionProvider direction='rtl'>
        <div>RTL Content</div>
      </DirectionProvider>
    )
    expect(container.textContent).toBe('RTL Content')
  })
})

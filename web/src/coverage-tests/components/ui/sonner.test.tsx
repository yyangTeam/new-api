import { render } from '@/test/test-utils'

import { Toaster } from '@/components/ui/sonner'

describe('Toaster', () => {
  test('renders without crashing', () => {
    const { container } = render(<Toaster />)
    expect(container).toBeInTheDocument()
  })

  test('renders with custom props', () => {
    const { container } = render(<Toaster position='top-center' />)
    expect(container).toBeInTheDocument()
  })
})

import { render } from '@/test/test-utils'

import { Progress } from './progress'

describe('Progress', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<Progress value={50} />)
    expect(
      container.querySelector('[data-slot="progress"]')
    ).toBeInTheDocument()
  })

  test('renders track with data-slot', () => {
    const { container } = render(<Progress value={50} />)
    expect(
      container.querySelector('[data-slot="progress-track"]')
    ).toBeInTheDocument()
  })

  test('renders indicator with data-slot', () => {
    const { container } = render(<Progress value={50} />)
    expect(
      container.querySelector('[data-slot="progress-indicator"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Progress value={75} className='my-progress' />)
    expect(container.querySelector('.my-progress')).toBeInTheDocument()
  })

  test('renders with value 0', () => {
    const { container } = render(<Progress value={0} />)
    expect(
      container.querySelector('[data-slot="progress"]')
    ).toBeInTheDocument()
  })

  test('renders with value 100', () => {
    const { container } = render(<Progress value={100} />)
    expect(
      container.querySelector('[data-slot="progress"]')
    ).toBeInTheDocument()
  })
})

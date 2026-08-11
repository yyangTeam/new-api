import { render } from '@/test/test-utils'

import { ReactIconByName } from '@/components/react-icon-by-name'

describe('ReactIconByName', () => {
  test('renders null for empty name', () => {
    const { container } = render(<ReactIconByName name='' />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null for null name', () => {
    const { container } = render(<ReactIconByName name={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null for undefined name', () => {
    const { container } = render(<ReactIconByName />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null for invalid name format (lowercase start)', () => {
    const { container } = render(<ReactIconByName name='invalidName' />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null for name with special characters', () => {
    const { container } = render(<ReactIconByName name='Fa-Icon!' />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null for whitespace-only name', () => {
    const { container } = render(<ReactIconByName name='   ' />)
    expect(container.firstChild).toBeNull()
  })

  test('renders null initially for valid icon name (before async resolve)', () => {
    const { container } = render(<ReactIconByName name='FaHome' />)
    // Initially null while async resolving
    expect(container.firstChild).toBeNull()
  })
})

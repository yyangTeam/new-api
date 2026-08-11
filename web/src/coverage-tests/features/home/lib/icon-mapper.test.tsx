import { render, screen } from '@testing-library/react'

import { getFeatureIcon } from '@/features/home/lib/icon-mapper'

describe('getFeatureIcon', () => {
  test('returns Zap icon component', () => {
    const result = getFeatureIcon('Zap', 'test-class')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('.test-class')).toBeInTheDocument()
  })

  test('returns Shield icon component', () => {
    const result = getFeatureIcon('Shield')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns Globe icon component', () => {
    const result = getFeatureIcon('Globe')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns Code icon component', () => {
    const result = getFeatureIcon('Code')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns Gauge icon component', () => {
    const result = getFeatureIcon('Gauge')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns DollarSign icon component', () => {
    const result = getFeatureIcon('DollarSign')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns Users icon component', () => {
    const result = getFeatureIcon('Users')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns HeartHandshake icon component', () => {
    const result = getFeatureIcon('HeartHandshake')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('returns null for unknown icon name', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getFeatureIcon('NonExistentIcon')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Icon "NonExistentIcon" not found in icon map'
    )
    consoleSpy.mockRestore()
  })

  test('passes className to icon', () => {
    const result = getFeatureIcon('Zap', 'custom-class')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  test('works without className parameter', () => {
    const result = getFeatureIcon('Shield')
    const { container } = render(<>{result}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

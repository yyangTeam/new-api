import { createStatusMapper } from './status'

describe('createStatusMapper', () => {
  const mapper = createStatusMapper({
    success: { label: 'Success', variant: 'green' },
    error: { label: 'Error', variant: 'red' },
    pending: { label: 'Pending', variant: 'yellow' },
  })

  describe('getLabel', () => {
    test('returns mapped label for known status', () => {
      expect(mapper.getLabel('success')).toBe('Success')
      expect(mapper.getLabel('error')).toBe('Error')
      expect(mapper.getLabel('pending')).toBe('Pending')
    })

    test('returns default label for unknown status', () => {
      expect(mapper.getLabel('unknown')).toBe('Unknown')
    })

    test('returns custom default label for unknown status', () => {
      expect(mapper.getLabel('unknown', 'N/A')).toBe('N/A')
    })

    test('returns default label for empty string status', () => {
      expect(mapper.getLabel('')).toBe('Unknown')
    })
  })

  describe('getVariant', () => {
    test('returns mapped variant for known status', () => {
      expect(mapper.getVariant('success')).toBe('green')
      expect(mapper.getVariant('error')).toBe('red')
      expect(mapper.getVariant('pending')).toBe('yellow')
    })

    test('returns default neutral variant for unknown status', () => {
      expect(mapper.getVariant('unknown')).toBe('neutral')
    })

    test('returns custom default variant for unknown status', () => {
      expect(mapper.getVariant('unknown', 'blue')).toBe('blue')
    })

    test('returns default variant for empty string status', () => {
      expect(mapper.getVariant('')).toBe('neutral')
    })
  })

  test('works with empty mapping', () => {
    const emptyMapper = createStatusMapper({})
    expect(emptyMapper.getLabel('any')).toBe('Unknown')
    expect(emptyMapper.getVariant('any')).toBe('neutral')
  })

  test('works with single entry mapping', () => {
    const singleMapper = createStatusMapper({
      active: { label: 'Active', variant: 'green' },
    })
    expect(singleMapper.getLabel('active')).toBe('Active')
    expect(singleMapper.getVariant('active')).toBe('green')
    expect(singleMapper.getLabel('inactive')).toBe('Unknown')
    expect(singleMapper.getVariant('inactive')).toBe('neutral')
  })
})

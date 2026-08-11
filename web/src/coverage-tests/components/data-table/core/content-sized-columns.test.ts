import { isContentSizedColumn } from '@/components/data-table/core/content-sized-columns'

describe('isContentSizedColumn', () => {
  test('returns true for actions column', () => {
    expect(isContentSizedColumn('actions')).toBe(true)
  })

  test('returns false for other columns', () => {
    expect(isContentSizedColumn('name')).toBe(false)
    expect(isContentSizedColumn('id')).toBe(false)
    expect(isContentSizedColumn('select')).toBe(false)
    expect(isContentSizedColumn('')).toBe(false)
  })
})

import { getCellLabel, tableHasCompactMeta } from '@/components/data-table/layout/card-cell-utils'

describe('getCellLabel', () => {
  test('returns header string when header is a string', () => {
    const cell = {
      column: {
        columnDef: {
          header: 'Name',
          meta: undefined,
        },
      },
    } as any

    expect(getCellLabel(cell)).toBe('Name')
  })

  test('returns meta.label when header is not a string', () => {
    const cell = {
      column: {
        columnDef: {
          header: () => 'component',
          meta: { label: 'User Name' },
        },
      },
    } as any

    expect(getCellLabel(cell)).toBe('User Name')
  })

  test('returns null when neither header string nor meta.label exists', () => {
    const cell = {
      column: {
        columnDef: {
          header: () => 'component',
          meta: {},
        },
      },
    } as any

    expect(getCellLabel(cell)).toBeNull()
  })

  test('returns null when meta is undefined', () => {
    const cell = {
      column: {
        columnDef: {
          header: () => 'component',
          meta: undefined,
        },
      },
    } as any

    expect(getCellLabel(cell)).toBeNull()
  })
})

describe('tableHasCompactMeta', () => {
  test('returns true when a column has mobileTitle meta', () => {
    const table = {
      getVisibleLeafColumns: () => [
        { columnDef: { meta: { mobileTitle: true } } },
        { columnDef: { meta: {} } },
      ],
    } as any

    expect(tableHasCompactMeta(table)).toBe(true)
  })

  test('returns true when a column has mobileBadge meta', () => {
    const table = {
      getVisibleLeafColumns: () => [
        { columnDef: { meta: { mobileBadge: true } } },
      ],
    } as any

    expect(tableHasCompactMeta(table)).toBe(true)
  })

  test('returns false when no columns have compact meta', () => {
    const table = {
      getVisibleLeafColumns: () => [
        { columnDef: { meta: {} } },
        { columnDef: { meta: { label: 'X' } } },
      ],
    } as any

    expect(tableHasCompactMeta(table)).toBe(false)
  })

  test('returns false for empty columns', () => {
    const table = {
      getVisibleLeafColumns: () => [],
    } as any

    expect(tableHasCompactMeta(table)).toBe(false)
  })
})

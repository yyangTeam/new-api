import { getTableSizeStyle } from './table-sizing'

describe('getTableSizeStyle', () => {
  test('returns style with minWidth based on visible columns', () => {
    const mockTable = {
      getVisibleLeafColumns: () => [
        { id: 'name', getSize: () => 200 },
        { id: 'email', getSize: () => 150 },
        { id: 'actions', getSize: () => 80 },
      ],
    } as any

    const style = getTableSizeStyle(mockTable)
    // actions is content-sized, so excluded: 200 + 150 = 350
    expect(style.minWidth).toBe('max(100%, 350px)')
    expect(style.tableLayout).toBe('auto')
    expect(style.width).toBe('100%')
  })

  test('returns 0 width when all columns are content-sized', () => {
    const mockTable = {
      getVisibleLeafColumns: () => [
        { id: 'actions', getSize: () => 80 },
      ],
    } as any

    const style = getTableSizeStyle(mockTable)
    expect(style.minWidth).toBe('max(100%, 0px)')
  })

  test('sums all non-content-sized column widths', () => {
    const mockTable = {
      getVisibleLeafColumns: () => [
        { id: 'col1', getSize: () => 100 },
        { id: 'col2', getSize: () => 200 },
        { id: 'col3', getSize: () => 300 },
      ],
    } as any

    const style = getTableSizeStyle(mockTable)
    expect(style.minWidth).toBe('max(100%, 600px)')
  })
})

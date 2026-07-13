import {
  getResolvedColumnClassName,
  getResolvedColumnClassNameFromMap,
  getPinnedColumnMap,
} from './column-pinning'
import type { DataTablePinnedColumn } from './types'

describe('getPinnedColumnMap', () => {
  test('returns undefined for undefined input', () => {
    expect(getPinnedColumnMap(undefined)).toBeUndefined()
  })

  test('returns undefined for empty array', () => {
    expect(getPinnedColumnMap([])).toBeUndefined()
  })

  test('returns a Map keyed by columnId', () => {
    const columns: DataTablePinnedColumn[] = [
      { columnId: 'name', side: 'left' },
      { columnId: 'actions', side: 'right' },
    ]
    const map = getPinnedColumnMap(columns)
    expect(map).toBeInstanceOf(Map)
    expect(map!.size).toBe(2)
    expect(map!.get('name')).toEqual(columns[0])
    expect(map!.get('actions')).toEqual(columns[1])
  })
})

describe('getResolvedColumnClassNameFromMap', () => {
  test('returns custom class name when no pinned columns', () => {
    const getter = getResolvedColumnClassNameFromMap(
      (colId) => `custom-${colId}`
    )
    expect(getter('name', 'header')).toBe('custom-name')
  })

  test('returns undefined when no getColumnClassName and no pinned columns', () => {
    const getter = getResolvedColumnClassNameFromMap()
    expect(getter('name', 'header')).toBeUndefined()
  })

  test('returns pinned classes for a pinned left column', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(undefined, pinnedMap)
    const result = getter('name', 'header')
    expect(result).toContain('sticky')
    expect(result).toContain('left-0')
  })

  test('returns pinned classes for a pinned right column', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['actions', { columnId: 'actions', side: 'right' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(undefined, pinnedMap)
    const result = getter('actions', 'cell')
    expect(result).toContain('sticky')
    expect(result).toContain('right-0')
  })

  test('merges custom className with pinned className', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(
      () => 'my-class',
      pinnedMap
    )
    const result = getter('name', 'header')
    expect(result).toContain('my-class')
    expect(result).toContain('sticky')
  })

  test('returns custom className for non-pinned column', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(
      (colId) => `cls-${colId}`,
      pinnedMap
    )
    expect(getter('other', 'cell')).toBe('cls-other')
  })

  test('applies headerClassName for header kind', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left', headerClassName: 'hdr-cls' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(undefined, pinnedMap)
    const result = getter('name', 'header')
    expect(result).toContain('hdr-cls')
  })

  test('applies cellClassName for cell kind', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left', cellClassName: 'cell-cls' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(undefined, pinnedMap)
    const result = getter('name', 'cell')
    expect(result).toContain('cell-cls')
  })

  test('applies shared className for both kinds', () => {
    const pinnedMap = new Map<string, DataTablePinnedColumn>([
      ['name', { columnId: 'name', side: 'left', className: 'shared-cls' }],
    ])
    const getter = getResolvedColumnClassNameFromMap(undefined, pinnedMap)
    expect(getter('name', 'header')).toContain('shared-cls')
    expect(getter('name', 'cell')).toContain('shared-cls')
  })
})

describe('getResolvedColumnClassName', () => {
  test('works with pinnedColumns array', () => {
    const pinnedColumns: DataTablePinnedColumn[] = [
      { columnId: 'name', side: 'left' },
    ]
    const getter = getResolvedColumnClassName(undefined, pinnedColumns)
    const result = getter('name', 'header')
    expect(result).toContain('sticky')
  })

  test('works without pinnedColumns', () => {
    const getter = getResolvedColumnClassName((colId) => `cls-${colId}`)
    expect(getter('name', 'header')).toBe('cls-name')
  })

  test('returns undefined when both params are undefined', () => {
    const getter = getResolvedColumnClassName()
    expect(getter('any', 'cell')).toBeUndefined()
  })
})

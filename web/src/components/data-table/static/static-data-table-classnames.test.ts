import { staticDataTableClassNames } from './static-data-table-classnames'

describe('staticDataTableClassNames', () => {
  test('container includes rounded-md and border', () => {
    expect(staticDataTableClassNames.container).toContain('rounded-md')
    expect(staticDataTableClassNames.container).toContain('border')
  })

  test('compactTable has text-sm class', () => {
    expect(staticDataTableClassNames.compactTable).toBe('text-sm')
  })

  test('compactHeaderCell includes uppercase', () => {
    expect(staticDataTableClassNames.compactHeaderCell).toContain('uppercase')
  })

  test('compactNumericCell has text-right and font-mono', () => {
    expect(staticDataTableClassNames.compactNumericCell).toContain('text-right')
    expect(staticDataTableClassNames.compactNumericCell).toContain('font-mono')
  })

  test('embeddedContainer removes border and rounded', () => {
    expect(staticDataTableClassNames.embeddedContainer).toContain('border-0')
    expect(staticDataTableClassNames.embeddedContainer).toContain('rounded-none')
  })

  test('actionCell has text-right', () => {
    expect(staticDataTableClassNames.actionCell).toContain('text-right')
  })

  test('mutedCell has muted-foreground class', () => {
    expect(staticDataTableClassNames.mutedCell).toContain('text-muted-foreground')
  })

  test('codeCell has font-mono', () => {
    expect(staticDataTableClassNames.codeCell).toContain('font-mono')
  })

  test('all expected keys exist', () => {
    const expectedKeys = [
      'container',
      'sectionContainer',
      'embeddedContainer',
      'compactTable',
      'compactHeaderRow',
      'mutedHeaderRow',
      'compactHeaderCell',
      'compactHeaderCellRight',
      'compactCell',
      'compactTopCell',
      'compactTopNumericCell',
      'compactMutedCell',
      'compactMutedCodeCell',
      'compactNumericCell',
      'compactMutedNumericCell',
      'topCell',
      'topMutedCell',
      'codeCell',
      'mutedCell',
      'mutedCodeCell',
      'topNumericCell',
      'mediumCell',
      'actionHeaderCell',
      'actionCell',
    ]
    for (const key of expectedKeys) {
      expect(staticDataTableClassNames).toHaveProperty(key)
    }
  })
})

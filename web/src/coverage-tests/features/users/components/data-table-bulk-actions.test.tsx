import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { DataTableBulkActions } from '@/features/users/components/data-table-bulk-actions'

vi.mock('@/components/data-table', () => ({
  DataTableBulkActions: ({ entityName, children }: { entityName: string; children: React.ReactNode }) => (
    <div data-testid='bulk-actions' data-entity={entityName}>
      {children}
    </div>
  ),
}))

describe('DataTableBulkActions', () => {
  test('renders BulkActionsToolbar with entityName user', () => {
    const mockTable = {} as any
    render(<DataTableBulkActions table={mockTable} />)
    const el = screen.getByTestId('bulk-actions')
    expect(el).toHaveAttribute('data-entity', 'user')
  })
})

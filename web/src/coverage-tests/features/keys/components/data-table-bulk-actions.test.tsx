import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/features/keys/components/api-keys-multi-delete-dialog', () => ({
  ApiKeysMultiDeleteDialog: () => <div data-testid='multi-delete' />,
}))
vi.mock('@/features/keys/components/api-keys-batch-edit-dialog', () => ({
  ApiKeysBatchEditDialog: () => <div data-testid='batch-edit' />,
}))
vi.mock('@/features/keys/components/api-keys-provider', () => ({
  useApiKeys: () => ({
    resolveRealKeysBatch: vi.fn().mockResolvedValue({}),
  }),
}))
vi.mock('@/components/data-table', () => ({
  DataTableBulkActions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='bulk-toolbar'>{children}</div>
  ),
}))

import { DataTableBulkActions } from '@/features/keys/components/data-table-bulk-actions'

const mockTable = {
  getFilteredSelectedRowModel: () => ({
    rows: [],
  }),
} as any

describe('DataTableBulkActions (keys)', () => {
  test('renders copy, edit, and delete action buttons', () => {
    render(<DataTableBulkActions table={mockTable} />)
    expect(screen.getByLabelText('Copy selected keys')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit selected API keys')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete selected API keys')).toBeInTheDocument()
  })

  test('renders multi-delete and batch-edit dialogs', () => {
    render(<DataTableBulkActions table={mockTable} />)
    expect(screen.getByTestId('multi-delete')).toBeInTheDocument()
    expect(screen.getByTestId('batch-edit')).toBeInTheDocument()
  })

  test('renders bulk toolbar wrapper', () => {
    render(<DataTableBulkActions table={mockTable} />)
    expect(screen.getByTestId('bulk-toolbar')).toBeInTheDocument()
  })
})

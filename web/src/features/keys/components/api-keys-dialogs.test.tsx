import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('./api-keys-batch-add-drawer', () => ({
  ApiKeysBatchAddDrawer: (props: { open: boolean }) => (
    <div data-testid='batch-add' data-open={props.open} />
  ),
}))
vi.mock('./api-keys-delete-dialog', () => ({
  ApiKeysDeleteDialog: () => <div data-testid='delete-dialog' />,
}))
vi.mock('./api-keys-mutate-drawer', () => ({
  ApiKeysMutateDrawer: (props: { open: boolean }) => (
    <div data-testid='mutate-drawer' data-open={props.open} />
  ),
}))
vi.mock('./dialogs/cc-switch-dialog', () => ({
  CCSwitchDialog: (props: { open: boolean }) => (
    <div data-testid='cc-switch' data-open={props.open} />
  ),
}))

let mockOpen: string | null = null
vi.mock('./api-keys-provider', () => ({
  useApiKeys: () => ({
    open: mockOpen,
    setOpen: vi.fn(),
    currentRow: null,
    resolvedKey: 'sk-test',
  }),
}))

import { ApiKeysDialogs } from './api-keys-dialogs'

describe('ApiKeysDialogs', () => {
  test('renders all dialog components', () => {
    render(<ApiKeysDialogs />)
    expect(screen.getByTestId('mutate-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('batch-add')).toBeInTheDocument()
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('cc-switch')).toBeInTheDocument()
  })

  test('mutate drawer is closed when open is null', () => {
    mockOpen = null
    render(<ApiKeysDialogs />)
    expect(screen.getByTestId('mutate-drawer')).toHaveAttribute('data-open', 'false')
  })

  test('mutate drawer is open when open is create', () => {
    mockOpen = 'create'
    render(<ApiKeysDialogs />)
    expect(screen.getByTestId('mutate-drawer')).toHaveAttribute('data-open', 'true')
  })

  test('batch add drawer is open when open is batch-create', () => {
    mockOpen = 'batch-create'
    render(<ApiKeysDialogs />)
    expect(screen.getByTestId('batch-add')).toHaveAttribute('data-open', 'true')
  })

  test('cc switch is open when open is cc-switch', () => {
    mockOpen = 'cc-switch'
    render(<ApiKeysDialogs />)
    expect(screen.getByTestId('cc-switch')).toHaveAttribute('data-open', 'true')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('./components/users-delete-dialog', () => ({
  UsersDeleteDialog: () => <div data-testid='delete-dialog' />,
}))
vi.mock('./components/users-mutate-drawer', () => ({
  UsersMutateDrawer: (props: { open: boolean }) => (
    <div data-testid='mutate-drawer' data-open={props.open} />
  ),
}))
vi.mock('./components/users-primary-buttons', () => ({
  UsersPrimaryButtons: () => <div data-testid='primary-buttons' />,
}))
vi.mock('./components/users-provider', () => ({
  UsersProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useUsers: () => ({
    open: null,
    setOpen: vi.fn(),
    currentRow: null,
  }),
}))
vi.mock('./components/users-table', () => ({
  UsersTable: () => <div data-testid='users-table' />,
}))
vi.mock('@/components/layout', () => ({
  SectionPageLayout: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Title: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
      Actions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }
  ),
}))

import { Users } from './index'

describe('Users page', () => {
  test('renders the page title', () => {
    render(<Users />)
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  test('renders UsersTable', () => {
    render(<Users />)
    expect(screen.getByTestId('users-table')).toBeInTheDocument()
  })

  test('renders UsersPrimaryButtons', () => {
    render(<Users />)
    expect(screen.getByTestId('primary-buttons')).toBeInTheDocument()
  })

  test('renders UsersDeleteDialog', () => {
    render(<Users />)
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
  })

  test('renders UsersMutateDrawer closed by default', () => {
    render(<Users />)
    const drawer = screen.getByTestId('mutate-drawer')
    expect(drawer).toHaveAttribute('data-open', 'false')
  })
})

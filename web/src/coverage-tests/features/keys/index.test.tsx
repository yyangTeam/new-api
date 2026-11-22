import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/features/keys/components/api-keys-dialogs', () => ({
  ApiKeysDialogs: () => <div data-testid='dialogs' />,
}))
vi.mock('@/features/keys/components/api-keys-primary-buttons', () => ({
  ApiKeysPrimaryButtons: () => <div data-testid='primary-buttons' />,
}))
vi.mock('@/features/keys/components/api-keys-provider', () => ({
  ApiKeysProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/keys/components/api-keys-table', () => ({
  ApiKeysTable: () => <div data-testid='keys-table' />,
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

import { ApiKeys } from '@/features/keys/index'

describe('ApiKeys page', () => {
  test('renders the page title', () => {
    render(<ApiKeys />)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
  })

  test('renders ApiKeysTable', () => {
    render(<ApiKeys />)
    expect(screen.getByTestId('keys-table')).toBeInTheDocument()
  })

  test('renders ApiKeysPrimaryButtons', () => {
    render(<ApiKeys />)
    expect(screen.getByTestId('primary-buttons')).toBeInTheDocument()
  })

  test('renders ApiKeysDialogs', () => {
    render(<ApiKeys />)
    expect(screen.getByTestId('dialogs')).toBeInTheDocument()
  })
})

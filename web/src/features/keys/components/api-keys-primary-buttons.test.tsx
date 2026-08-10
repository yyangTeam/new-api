import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { ApiKeysPrimaryButtons } from './api-keys-primary-buttons'

const mockSetOpen = vi.fn()

vi.mock('./api-keys-provider', () => ({
  useApiKeys: () => ({
    setOpen: mockSetOpen,
  }),
}))

describe('ApiKeysPrimaryButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders Create and Batch buttons', () => {
    render(<ApiKeysPrimaryButtons />)
    expect(screen.getByText('Create API Key')).toBeInTheDocument()
    expect(screen.getByText('Batch Add Tokens')).toBeInTheDocument()
  })

  test('clicking Create sets open to create', () => {
    render(<ApiKeysPrimaryButtons />)
    screen.getByText('Create API Key').click()
    expect(mockSetOpen).toHaveBeenCalledWith('create')
  })

  test('clicking Batch Add sets open to batch-create', () => {
    render(<ApiKeysPrimaryButtons />)
    screen.getByText('Batch Add Tokens').click()
    expect(mockSetOpen).toHaveBeenCalledWith('batch-create')
  })
})

import { render, screen, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { ApiKeysProvider, useApiKeys } from './api-keys-provider'

vi.mock('../api', () => ({
  fetchTokenKey: vi.fn(),
  fetchTokenKeysBatch: vi.fn(),
}))

import { fetchTokenKey, fetchTokenKeysBatch } from '../api'

const mockFetchTokenKey = fetchTokenKey as unknown as ReturnType<typeof vi.fn>
const mockFetchTokenKeysBatch = fetchTokenKeysBatch as unknown as ReturnType<typeof vi.fn>

function TestConsumer() {
  const ctx = useApiKeys()
  return (
    <div>
      <span data-testid='open'>{String(ctx.open)}</span>
      <span data-testid='currentRow'>{JSON.stringify(ctx.currentRow)}</span>
      <span data-testid='refreshTrigger'>{ctx.refreshTrigger}</span>
      <span data-testid='resolvedKey'>{ctx.resolvedKey}</span>
      <span data-testid='resolvedKeys'>{JSON.stringify(ctx.resolvedKeys)}</span>
      <span data-testid='copiedKeyId'>{String(ctx.copiedKeyId)}</span>
      <button onClick={() => ctx.setOpen('create')}>open-create</button>
      <button onClick={() => ctx.setOpen(null)}>close</button>
      <button onClick={() => ctx.triggerRefresh()}>refresh</button>
      <button onClick={() => ctx.setResolvedKey('sk-test')}>set-key</button>
      <button onClick={() => ctx.resolveRealKey(1)}>resolve-1</button>
      <button onClick={() => ctx.resolveRealKeysBatch([1, 2])}>resolve-batch</button>
      <button onClick={() => ctx.markKeyCopied(1)}>mark-copied</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ApiKeysProvider', () => {
  test('provides initial context values', () => {
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    expect(screen.getByTestId('open')).toHaveTextContent('null')
    expect(screen.getByTestId('currentRow')).toHaveTextContent('null')
    expect(screen.getByTestId('refreshTrigger')).toHaveTextContent('0')
    expect(screen.getByTestId('resolvedKey')).toHaveTextContent('')
  })

  test('setOpen updates open state', () => {
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    act(() => { screen.getByText('open-create').click() })
    expect(screen.getByTestId('open')).toHaveTextContent('create')
  })

  test('triggerRefresh increments counter', () => {
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    act(() => { screen.getByText('refresh').click() })
    expect(screen.getByTestId('refreshTrigger')).toHaveTextContent('1')
  })

  test('setResolvedKey updates resolvedKey', () => {
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    act(() => { screen.getByText('set-key').click() })
    expect(screen.getByTestId('resolvedKey')).toHaveTextContent('sk-test')
  })

  test('resolveRealKey fetches and caches key', async () => {
    mockFetchTokenKey.mockResolvedValue({ success: true, data: { key: 'abc123' } })
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-1').click() })
    expect(mockFetchTokenKey).toHaveBeenCalledWith(1)
    expect(screen.getByTestId('resolvedKeys')).toHaveTextContent('sk-abc123')
  })

  test('resolveRealKey returns null on failure', async () => {
    mockFetchTokenKey.mockResolvedValue({ success: false, message: 'err' })
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-1').click() })
    expect(screen.getByTestId('resolvedKeys')).toHaveTextContent('{}')
  })

  test('resolveRealKey returns null on exception', async () => {
    mockFetchTokenKey.mockRejectedValue(new Error('network'))
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-1').click() })
    expect(screen.getByTestId('resolvedKeys')).toHaveTextContent('{}')
  })

  test('resolveRealKeysBatch fetches and caches multiple keys', async () => {
    mockFetchTokenKeysBatch.mockResolvedValue({ success: true, data: { keys: { '1': 'k1', '2': 'k2' } } })
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-batch').click() })
    expect(mockFetchTokenKeysBatch).toHaveBeenCalledWith([1, 2])
    const content = screen.getByTestId('resolvedKeys').textContent
    expect(content).toContain('sk-k1')
    expect(content).toContain('sk-k2')
  })

  test('resolveRealKeysBatch returns empty on failure', async () => {
    mockFetchTokenKeysBatch.mockResolvedValue({ success: false })
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-batch').click() })
    expect(screen.getByTestId('resolvedKeys')).toHaveTextContent('{}')
  })

  test('resolveRealKeysBatch returns empty on exception', async () => {
    mockFetchTokenKeysBatch.mockRejectedValue(new Error('network'))
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    await act(async () => { screen.getByText('resolve-batch').click() })
    expect(screen.getByTestId('resolvedKeys')).toHaveTextContent('{}')
  })

  test('markKeyCopied sets copiedKeyId then clears after timeout', () => {
    render(
      <ApiKeysProvider>
        <TestConsumer />
      </ApiKeysProvider>
    )
    act(() => { screen.getByText('mark-copied').click() })
    expect(screen.getByTestId('copiedKeyId')).toHaveTextContent('1')
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByTestId('copiedKeyId')).toHaveTextContent('null')
  })
})

describe('useApiKeys', () => {
  test('throws when used outside ApiKeysProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useApiKeys has to be used within <ApiKeysContext>'
    )
    spy.mockRestore()
  })
})

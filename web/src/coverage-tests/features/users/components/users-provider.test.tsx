import { render, screen, act } from '@testing-library/react'
import { describe, test, expect } from 'vitest'

import { UsersProvider, useUsers } from '@/features/users/components/users-provider'

function TestConsumer() {
  const ctx = useUsers()
  return (
    <div>
      <span data-testid='open'>{String(ctx.open)}</span>
      <span data-testid='currentRow'>{JSON.stringify(ctx.currentRow)}</span>
      <span data-testid='refreshTrigger'>{ctx.refreshTrigger}</span>
      <button onClick={() => ctx.setOpen('create')}>open-create</button>
      <button onClick={() => ctx.setOpen(null)}>close</button>
      <button onClick={() => ctx.setCurrentRow({ id: 1, username: 'a', display_name: 'A', quota: 0, used_quota: 0, request_count: 0, group: 'default', status: 1, role: 1 })}>set-row</button>
      <button onClick={() => ctx.triggerRefresh()}>refresh</button>
    </div>
  )
}

describe('UsersProvider', () => {
  test('provides initial context values', () => {
    render(
      <UsersProvider>
        <TestConsumer />
      </UsersProvider>
    )
    expect(screen.getByTestId('open')).toHaveTextContent('null')
    expect(screen.getByTestId('currentRow')).toHaveTextContent('null')
    expect(screen.getByTestId('refreshTrigger')).toHaveTextContent('0')
  })

  test('setOpen updates open state', () => {
    render(
      <UsersProvider>
        <TestConsumer />
      </UsersProvider>
    )
    act(() => {
      screen.getByText('open-create').click()
    })
    expect(screen.getByTestId('open')).toHaveTextContent('create')
  })

  test('setOpen(null) clears open state', () => {
    render(
      <UsersProvider>
        <TestConsumer />
      </UsersProvider>
    )
    act(() => {
      screen.getByText('open-create').click()
    })
    act(() => {
      screen.getByText('close').click()
    })
    expect(screen.getByTestId('open')).toHaveTextContent('null')
  })

  test('setCurrentRow updates currentRow', () => {
    render(
      <UsersProvider>
        <TestConsumer />
      </UsersProvider>
    )
    act(() => {
      screen.getByText('set-row').click()
    })
    expect(screen.getByTestId('currentRow')).toHaveTextContent('"id":1')
  })

  test('triggerRefresh increments refreshTrigger', () => {
    render(
      <UsersProvider>
        <TestConsumer />
      </UsersProvider>
    )
    act(() => {
      screen.getByText('refresh').click()
    })
    expect(screen.getByTestId('refreshTrigger')).toHaveTextContent('1')
    act(() => {
      screen.getByText('refresh').click()
    })
    expect(screen.getByTestId('refreshTrigger')).toHaveTextContent('2')
  })
})

describe('useUsers', () => {
  test('throws when used outside UsersProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useUsers has to be used within <UsersContext>'
    )
    spy.mockRestore()
  })
})

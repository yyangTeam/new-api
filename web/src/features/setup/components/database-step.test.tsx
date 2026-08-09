import { render, screen } from '@/test/test-utils'

import { DatabaseStep } from './database-step'
import type { SetupStatus } from '../types'

function createStatus(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return {
    status: false,
    root_init: false,
    database_type: 'sqlite',
    ...overrides,
  }
}

describe('DatabaseStep', () => {
  test('shows "Unknown" when status is undefined', () => {
    render(<DatabaseStep status={undefined} />)
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
  })

  test('displays SQLite label and warning when database_type is sqlite', () => {
    render(<DatabaseStep status={createStatus({ database_type: 'sqlite' })} />)
    expect(screen.getAllByText('SQLite').length).toBeGreaterThan(0)
    expect(screen.getByText('Persist your data file')).toBeInTheDocument()
  })

  test('displays MySQL label and alert when database_type is mysql', () => {
    render(<DatabaseStep status={createStatus({ database_type: 'mysql' })} />)
    expect(screen.getAllByText('MySQL').length).toBeGreaterThan(0)
    expect(screen.getByText('MySQL detected')).toBeInTheDocument()
  })

  test('displays PostgreSQL label and alert when database_type is postgres', () => {
    render(
      <DatabaseStep status={createStatus({ database_type: 'postgres' })} />
    )
    expect(screen.getAllByText('PostgreSQL').length).toBeGreaterThan(0)
    expect(screen.getByText('PostgreSQL detected')).toBeInTheDocument()
  })

  test('does not show SQLite persistence warning for non-sqlite databases', () => {
    render(<DatabaseStep status={createStatus({ database_type: 'mysql' })} />)
    expect(
      screen.queryByText('Persist your data file')
    ).not.toBeInTheDocument()
  })

  test('shows database description text', () => {
    render(<DatabaseStep status={createStatus({ database_type: 'sqlite' })} />)
    expect(
      screen.getByText(
        'SQLite stores all data in a single file. Make sure that file is persisted when running in containers.'
      )
    ).toBeInTheDocument()
  })

  test('normalizes database type case', () => {
    render(<DatabaseStep status={createStatus({ database_type: 'MySQL' })} />)
    expect(screen.getAllByText('MySQL').length).toBeGreaterThan(0)
  })

  test('handles unknown database type gracefully', () => {
    render(
      <DatabaseStep status={createStatus({ database_type: 'cockroachdb' })} />
    )
    // Should display the raw type as the label
    expect(screen.getAllByText('cockroachdb').length).toBeGreaterThan(0)
  })
})

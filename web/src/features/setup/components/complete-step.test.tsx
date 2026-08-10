import { render, screen } from '@/test/test-utils'

import { CompleteStep } from './complete-step'
import type { SetupFormValues, SetupStatus } from '../types'

const defaultValues: SetupFormValues = {
  username: 'admin',
  password: 'password123',
  confirmPassword: 'password123',
  usageMode: 'external',
}

const defaultStatus: SetupStatus = {
  status: false,
  root_init: false,
  database_type: 'sqlite',
}

describe('CompleteStep', () => {
  test('renders "Ready to initialize" heading', () => {
    render(<CompleteStep status={defaultStatus} values={defaultValues} />)
    expect(screen.getByText('Ready to initialize')).toBeInTheDocument()
  })

  test('displays database type', () => {
    render(<CompleteStep status={defaultStatus} values={defaultValues} />)
    expect(screen.getAllByText('sqlite').length).toBeGreaterThan(0)
  })

  test('displays username when root is not initialized', () => {
    render(<CompleteStep status={defaultStatus} values={defaultValues} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  test('displays "Existing account will be reused" when root is initialized', () => {
    const status = { ...defaultStatus, root_init: true }
    render(<CompleteStep status={status} values={defaultValues} />)
    expect(
      screen.getByText('Existing account will be reused')
    ).toBeInTheDocument()
  })

  test('displays "Not set yet" when username is empty and root not init', () => {
    const values = { ...defaultValues, username: '' }
    render(<CompleteStep status={defaultStatus} values={values} />)
    expect(screen.getByText('Not set yet')).toBeInTheDocument()
  })

  test('displays usage mode label for external', () => {
    render(<CompleteStep status={defaultStatus} values={defaultValues} />)
    expect(screen.getByText('External operations mode')).toBeInTheDocument()
  })

  test('displays usage mode label for self', () => {
    const values = { ...defaultValues, usageMode: 'self' as const }
    render(<CompleteStep status={defaultStatus} values={values} />)
    expect(screen.getByText('Personal use mode')).toBeInTheDocument()
  })

  test('displays usage mode label for demo', () => {
    const values = { ...defaultValues, usageMode: 'demo' as const }
    render(<CompleteStep status={defaultStatus} values={values} />)
    expect(screen.getByText('Demo site mode')).toBeInTheDocument()
  })

  test('shows "Unknown" when status is undefined', () => {
    render(<CompleteStep status={undefined} values={defaultValues} />)
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
  })

  test('uses success variant for mysql database', () => {
    const status = { ...defaultStatus, database_type: 'mysql' }
    render(<CompleteStep status={status} values={defaultValues} />)
    expect(screen.getAllByText('mysql').length).toBeGreaterThan(0)
  })

  test('uses success variant for postgres database', () => {
    const status = { ...defaultStatus, database_type: 'postgres' }
    render(<CompleteStep status={status} values={defaultValues} />)
    expect(screen.getAllByText('postgres').length).toBeGreaterThan(0)
  })

  test('uses neutral variant for unknown database type', () => {
    const status = { ...defaultStatus, database_type: 'cockroachdb' }
    render(<CompleteStep status={status} values={defaultValues} />)
    expect(screen.getAllByText('cockroachdb').length).toBeGreaterThan(0)
  })
})

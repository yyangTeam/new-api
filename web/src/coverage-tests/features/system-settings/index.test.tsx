import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet content'),
}))

import { SystemSettings } from '@/features/system-settings/index'

describe('SystemSettings', () => {
  it('renders an Outlet', () => {
    const { getByTestId } = render(React.createElement(SystemSettings))
    expect(getByTestId('outlet')).toBeInTheDocument()
  })
})

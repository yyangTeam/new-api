import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('./settings-page-context', () => ({
  SettingsPageTitleStatusPortal: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'portal' }, children),
}))

import { FormDirtyIndicator } from './form-dirty-indicator'

describe('FormDirtyIndicator', () => {
  it('renders nothing when isDirty is false', () => {
    const { container } = render(
      React.createElement(FormDirtyIndicator, { isDirty: false })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders indicator when isDirty is true', () => {
    render(React.createElement(FormDirtyIndicator, { isDirty: true }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('renders custom message when provided', () => {
    render(
      React.createElement(FormDirtyIndicator, {
        isDirty: true,
        message: 'Custom dirty message',
      })
    )
    expect(screen.getByText('Custom dirty message')).toBeInTheDocument()
  })

  it('renders inside the title status portal', () => {
    render(React.createElement(FormDirtyIndicator, { isDirty: true }))
    expect(screen.getByTestId('portal')).toBeInTheDocument()
  })
})

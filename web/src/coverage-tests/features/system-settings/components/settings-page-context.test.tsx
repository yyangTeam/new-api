import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef(
    (
      {
        children,
        onClick,
        disabled,
        ...props
      }: {
        children: React.ReactNode
        onClick?: () => void
        disabled?: boolean
        type?: string
        size?: string
        variant?: string
      },
      ref: React.Ref<HTMLButtonElement>
    ) =>
      React.createElement(
        'button',
        { onClick, disabled, ref, ...props },
        children
      )
  ),
}))

import {
  SettingsPageProvider,
  SettingsPageActionsPortal,
  SettingsPageTitleStatusPortal,
  SettingsPageFormActions,
  useSuppressSettingsSectionHeader,
} from '@/features/system-settings/components/settings-page-context'

describe('SettingsPageProvider', () => {
  it('provides actions container to children', () => {
    const container = document.createElement('div')

    function TestChild() {
      return React.createElement(
        SettingsPageActionsPortal,
        null,
        React.createElement('span', null, 'Action')
      )
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )

    expect(container.textContent).toContain('Action')
  })

  it('provides title status container to children', () => {
    const container = document.createElement('span')

    function TestChild() {
      return React.createElement(
        SettingsPageTitleStatusPortal,
        null,
        'Status'
      )
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: null, titleStatusContainer: container },
        React.createElement(TestChild)
      )
    )

    expect(container.textContent).toContain('Status')
  })
})

describe('SettingsPageActionsPortal', () => {
  it('renders nothing when no container is provided', () => {
    function TestChild() {
      return React.createElement(
        SettingsPageActionsPortal,
        null,
        React.createElement('span', null, 'No Portal')
      )
    }

    const { container } = render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: null },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toBe('')
  })
})

describe('SettingsPageTitleStatusPortal', () => {
  it('renders nothing when no container is provided', () => {
    function TestChild() {
      return React.createElement(
        SettingsPageTitleStatusPortal,
        null,
        'Status'
      )
    }

    const { container } = render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: null, titleStatusContainer: null },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toBe('')
  })
})

describe('useSuppressSettingsSectionHeader', () => {
  it('defaults to true when suppressSectionHeader is not provided', () => {
    let value: boolean | undefined

    function TestChild() {
      value = useSuppressSettingsSectionHeader()
      return null
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: null },
        React.createElement(TestChild)
      )
    )
    expect(value).toBe(true)
  })

  it('returns false when suppressSectionHeader is false', () => {
    let value: boolean | undefined

    function TestChild() {
      value = useSuppressSettingsSectionHeader()
      return null
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: null, suppressSectionHeader: false },
        React.createElement(TestChild)
      )
    )
    expect(value).toBe(false)
  })
})

describe('SettingsPageFormActions', () => {
  it('renders save button via portal', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function TestChild() {
      return React.createElement(SettingsPageFormActions, {
        onSave: vi.fn(),
      })
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toContain('Save Changes')
    document.body.removeChild(container)
  })

  it('renders reset button when onReset is provided', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function TestChild() {
      return React.createElement(SettingsPageFormActions, {
        onSave: vi.fn(),
        onReset: vi.fn(),
      })
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toContain('Reset')
    document.body.removeChild(container)
  })

  it('does not render reset button when onReset is not provided', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function TestChild() {
      return React.createElement(SettingsPageFormActions, {
        onSave: vi.fn(),
      })
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).not.toContain('Reset')
    document.body.removeChild(container)
  })

  it('shows saving label when isSaving is true', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function TestChild() {
      return React.createElement(SettingsPageFormActions, {
        onSave: vi.fn(),
        isSaving: true,
      })
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toContain('Saving...')
    document.body.removeChild(container)
  })

  it('uses custom save/reset labels', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function TestChild() {
      return React.createElement(SettingsPageFormActions, {
        onSave: vi.fn(),
        onReset: vi.fn(),
        saveLabel: 'Apply',
        resetLabel: 'Undo',
      })
    }

    render(
      React.createElement(
        SettingsPageProvider,
        { actionsContainer: container },
        React.createElement(TestChild)
      )
    )
    expect(container.textContent).toContain('Apply')
    expect(container.textContent).toContain('Undo')
    document.body.removeChild(container)
  })
})

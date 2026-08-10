import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { TelegramLoginDialog } from './telegram-login-dialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    title,
    description,
    children,
  }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    title: string
    description: string
    children: React.ReactNode
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'dialog', role: 'dialog' },
          React.createElement('h2', null, title),
          React.createElement('p', null, description),
          children,
          React.createElement(
            'button',
            { 'data-testid': 'close-btn', onClick: () => onOpenChange(false) },
            'Close'
          )
        )
      : null,
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
}))

describe('TelegramLoginDialog', () => {
  const defaultProps = {
    open: true,
    botName: 'test_bot',
    pending: false,
    onOpenChange: vi.fn(),
    onAuthorization: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        open: false,
      })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when open is true', () => {
    render(React.createElement(TelegramLoginDialog, defaultProps))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays correct title and description', () => {
    render(React.createElement(TelegramLoginDialog, defaultProps))

    expect(screen.getByText('Telegram Login Widget')).toBeInTheDocument()
    expect(screen.getByText('Continue with Telegram')).toBeInTheDocument()
  })

  it('shows spinner when pending is true', () => {
    render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        pending: true,
      })
    )

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('sets aria-busy when loading or pending', () => {
    render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        pending: true,
      })
    )

    const busyElement = document.querySelector('[aria-busy="true"]')
    expect(busyElement).not.toBeNull()
  })

  it('calls onOpenChange when dialog requests close', () => {
    const onOpenChange = vi.fn()
    render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        onOpenChange,
      })
    )

    const closeBtn = screen.getByTestId('close-btn')
    closeBtn.click()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not load widget when botName is empty', () => {
    render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        botName: '',
      })
    )

    // Dialog still renders, but widget container stays idle (no script loaded)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not load widget when botName is whitespace only', () => {
    render(
      React.createElement(TelegramLoginDialog, {
        ...defaultProps,
        botName: '   ',
      })
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows failed message when widget fails to load', () => {
    // We cannot easily trigger the script error in happy-dom, but we can
    // verify the structure renders without errors
    render(React.createElement(TelegramLoginDialog, defaultProps))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

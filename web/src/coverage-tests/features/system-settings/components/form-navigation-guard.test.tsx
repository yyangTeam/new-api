import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(() => ({ status: 'idle' })),
}))

vi.mock('@/components/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    desc,
    confirmText,
    cancelBtnText,
    handleConfirm,
    onOpenChange,
  }: {
    open: boolean
    title: string
    desc: string
    confirmText: string
    cancelBtnText: string
    handleConfirm: () => void
    onOpenChange: (open: boolean) => void
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'confirm-dialog' },
          React.createElement('h2', null, title),
          React.createElement('p', null, desc),
          React.createElement(
            'button',
            { onClick: handleConfirm, 'data-testid': 'confirm-btn' },
            confirmText
          ),
          React.createElement(
            'button',
            { onClick: () => onOpenChange(false), 'data-testid': 'cancel-btn' },
            cancelBtnText
          )
        )
      : null,
}))

import { useBlocker } from '@tanstack/react-router'
import { FormNavigationGuard } from '@/features/system-settings/components/form-navigation-guard'

const mockUseBlocker = vi.mocked(useBlocker)

describe('FormNavigationGuard', () => {
  it('does not show dialog when when is false', () => {
    mockUseBlocker.mockReturnValue({ status: 'idle' } as ReturnType<typeof useBlocker>)
    render(React.createElement(FormNavigationGuard, { when: false }))
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('calls useBlocker with condition from when prop', () => {
    mockUseBlocker.mockReturnValue({ status: 'idle' } as ReturnType<typeof useBlocker>)
    render(React.createElement(FormNavigationGuard, { when: true }))
    expect(mockUseBlocker).toHaveBeenCalledWith({ condition: true })
  })

  it('shows dialog when blocker status is blocked', () => {
    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBlocker>)

    render(React.createElement(FormNavigationGuard, { when: true }))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('displays default title and message', () => {
    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBlocker>)

    render(React.createElement(FormNavigationGuard, { when: true }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(
      screen.getByText(
        'You have unsaved changes. Are you sure you want to leave?'
      )
    ).toBeInTheDocument()
  })

  it('uses custom title and message', () => {
    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBlocker>)

    render(
      React.createElement(FormNavigationGuard, {
        when: true,
        title: 'Custom Title',
        message: 'Custom Message',
      })
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Message')).toBeInTheDocument()
  })

  it('calls blocker.proceed when confirm is clicked', () => {
    const proceed = vi.fn()
    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBlocker>)

    render(React.createElement(FormNavigationGuard, { when: true }))
    fireEvent.click(screen.getByTestId('confirm-btn'))
    expect(proceed).toHaveBeenCalled()
  })

  it('calls blocker.reset when cancel is clicked', () => {
    const reset = vi.fn()
    mockUseBlocker.mockReturnValue({
      status: 'blocked',
      proceed: vi.fn(),
      reset,
    } as unknown as ReturnType<typeof useBlocker>)

    render(React.createElement(FormNavigationGuard, { when: true }))
    fireEvent.click(screen.getByTestId('cancel-btn'))
    expect(reset).toHaveBeenCalled()
  })

  it('adds beforeunload listener when when is true', () => {
    mockUseBlocker.mockReturnValue({ status: 'idle' } as ReturnType<typeof useBlocker>)
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(React.createElement(FormNavigationGuard, { when: true }))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    addSpy.mockRestore()
  })

  it('does not add beforeunload listener when when is false', () => {
    mockUseBlocker.mockReturnValue({ status: 'idle' } as ReturnType<typeof useBlocker>)
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(React.createElement(FormNavigationGuard, { when: false }))
    expect(addSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
    addSpy.mockRestore()
  })
})

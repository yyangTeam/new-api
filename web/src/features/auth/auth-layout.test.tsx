import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { AuthLayout } from './auth-layout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}))

const mockUseSystemConfig = vi.fn()
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => mockUseSystemConfig(),
}))

describe('AuthLayout', () => {
  beforeEach(() => {
    mockUseSystemConfig.mockReturnValue({
      systemName: 'TestAPI',
      logo: '/logo.png',
      loading: false,
    })
  })

  it('renders children', () => {
    render(
      React.createElement(AuthLayout, null,
        React.createElement('div', { 'data-testid': 'child' }, 'Hello')
      )
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders system name', () => {
    render(
      React.createElement(AuthLayout, null, React.createElement('div', null, 'x'))
    )

    expect(screen.getByText('TestAPI')).toBeInTheDocument()
  })

  it('renders logo image', () => {
    render(
      React.createElement(AuthLayout, null, React.createElement('div', null, 'x'))
    )

    const img = screen.getByAltText('Logo')
    expect(img).toHaveAttribute('src', '/logo.png')
  })

  it('shows skeleton during loading', () => {
    mockUseSystemConfig.mockReturnValue({
      systemName: 'TestAPI',
      logo: '/logo.png',
      loading: true,
    })

    render(
      React.createElement(AuthLayout, null, React.createElement('div', null, 'x'))
    )

    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('has link to home page', () => {
    render(
      React.createElement(AuthLayout, null, React.createElement('div', null, 'x'))
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })
})

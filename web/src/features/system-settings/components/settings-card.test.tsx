import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h3', { 'data-testid': 'card-title' }, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', { 'data-testid': 'card-description' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card-content' }, children),
}))

import { SettingsCard } from './settings-card'

describe('SettingsCard', () => {
  it('renders title', () => {
    render(
      React.createElement(SettingsCard, { title: 'My Title' }, 'content')
    )
    expect(screen.getByTestId('card-title')).toHaveTextContent('My Title')
  })

  it('renders children in card content', () => {
    render(
      React.createElement(
        SettingsCard,
        { title: 'Title' },
        React.createElement('span', null, 'Child content')
      )
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      React.createElement(
        SettingsCard,
        { title: 'Title', description: 'A description' },
        'content'
      )
    )
    expect(screen.getByTestId('card-description')).toHaveTextContent(
      'A description'
    )
  })

  it('does not render description when not provided', () => {
    render(
      React.createElement(SettingsCard, { title: 'Title' }, 'content')
    )
    expect(screen.queryByTestId('card-description')).not.toBeInTheDocument()
  })

  it('passes className to Card', () => {
    render(
      React.createElement(
        SettingsCard,
        { title: 'Title', className: 'custom-class' },
        'content'
      )
    )
    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })
})

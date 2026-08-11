import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/accordion', () => ({
  AccordionItem: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) =>
    React.createElement('div', { 'data-testid': `accordion-item-${value}`, className }, children),
  AccordionTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('button', { 'data-testid': 'accordion-trigger', className }, children),
  AccordionContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'accordion-content', className }, children),
}))

import { SettingsAccordion } from '@/features/system-settings/components/settings-accordion'

describe('SettingsAccordion', () => {
  it('renders title in trigger', () => {
    render(
      React.createElement(
        SettingsAccordion,
        { value: 'test', title: 'Test Section' },
        'Content'
      )
    )
    expect(screen.getByText('Test Section')).toBeInTheDocument()
  })

  it('renders children in content area', () => {
    render(
      React.createElement(
        SettingsAccordion,
        { value: 'item1', title: 'Title' },
        React.createElement('span', null, 'Inner content')
      )
    )
    expect(screen.getByText('Inner content')).toBeInTheDocument()
  })

  it('uses value prop for accordion item', () => {
    render(
      React.createElement(
        SettingsAccordion,
        { value: 'my-section', title: 'My Section' },
        'content'
      )
    )
    expect(screen.getByTestId('accordion-item-my-section')).toBeInTheDocument()
  })

  it('passes className to accordion item', () => {
    render(
      React.createElement(
        SettingsAccordion,
        { value: 'v', title: 'T', className: 'extra' },
        'c'
      )
    )
    expect(screen.getByTestId('accordion-item-v').className).toContain('extra')
  })
})

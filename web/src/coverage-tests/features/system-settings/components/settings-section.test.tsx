import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/features/system-settings/components/settings-page-context', () => ({
  useSuppressSettingsSectionHeader: vi.fn(() => false),
}))

import { useSuppressSettingsSectionHeader } from '@/features/system-settings/components/settings-page-context'
import { SettingsSection } from '@/features/system-settings/components/settings-section'

const mockUseSuppressHeader = vi.mocked(useSuppressSettingsSectionHeader)

describe('SettingsSection', () => {
  it('renders title and children when header is not suppressed', () => {
    mockUseSuppressHeader.mockReturnValue(false)
    render(
      React.createElement(
        SettingsSection,
        { title: 'Section Title' },
        React.createElement('p', null, 'Section content')
      )
    )
    expect(screen.getByText('Section Title')).toBeInTheDocument()
    expect(screen.getByText('Section content')).toBeInTheDocument()
  })

  it('hides title when header is suppressed', () => {
    mockUseSuppressHeader.mockReturnValue(true)
    render(
      React.createElement(
        SettingsSection,
        { title: 'Hidden Title' },
        React.createElement('p', null, 'Content only')
      )
    )
    expect(screen.queryByText('Hidden Title')).not.toBeInTheDocument()
    expect(screen.getByText('Content only')).toBeInTheDocument()
  })

  it('applies className', () => {
    mockUseSuppressHeader.mockReturnValue(false)
    const { container } = render(
      React.createElement(
        SettingsSection,
        { title: 'Test', className: 'extra-class' },
        'child'
      )
    )
    const section = container.querySelector('section')
    expect(section?.className).toContain('extra-class')
  })

  it('applies titleProps to heading', () => {
    mockUseSuppressHeader.mockReturnValue(false)
    render(
      React.createElement(
        SettingsSection,
        { title: 'Styled', titleProps: { className: 'title-custom' } },
        'child'
      )
    )
    const heading = screen.getByText('Styled')
    expect(heading.className).toContain('title-custom')
  })
})

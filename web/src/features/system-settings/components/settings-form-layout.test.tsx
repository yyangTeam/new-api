import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/form', () => ({
  FormItem: ({ children, className, ...props }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'form-item', className, ...props }, children),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('label', { className }, children),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange(e.target.checked),
      disabled,
      'data-testid': 'switch',
    }),
}))

import {
  SettingsFormGrid,
  SettingsFormGridItem,
  SettingsSwitchItem,
  SettingsSwitchRow,
  SettingsSwitchField,
  SettingsSwitchContent,
  SettingsControlGroup,
  SettingsControlChildren,
  SettingsForm,
} from './settings-form-layout'

describe('SettingsFormGrid', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsFormGrid, {}, React.createElement('span', null, 'Grid child'))
    )
    expect(screen.getByText('Grid child')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      React.createElement(SettingsFormGrid, { className: 'custom' }, 'content')
    )
    expect(container.firstElementChild?.className).toContain('custom')
  })
})

describe('SettingsFormGridItem', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsFormGridItem, {}, 'Item content')
    )
    expect(screen.getByText('Item content')).toBeInTheDocument()
  })

  it('applies full span', () => {
    const { container } = render(
      React.createElement(SettingsFormGridItem, { span: 'full' }, 'Full')
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-settings-form-span')).toBe('full')
  })

  it('does not apply full span by default', () => {
    const { container } = render(
      React.createElement(SettingsFormGridItem, {}, 'Default')
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-settings-form-span')).toBeNull()
  })
})

describe('SettingsSwitchItem', () => {
  it('renders with form-item data-testid', () => {
    render(
      React.createElement(SettingsSwitchItem, {}, 'Switch item')
    )
    expect(screen.getByTestId('form-item')).toBeInTheDocument()
  })
})

describe('SettingsSwitchRow', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsSwitchRow, {}, 'Row content')
    )
    expect(screen.getByText('Row content')).toBeInTheDocument()
  })
})

describe('SettingsSwitchField', () => {
  it('renders label and switch', () => {
    render(
      React.createElement(SettingsSwitchField, {
        checked: true,
        onCheckedChange: vi.fn(),
        label: 'Enable feature',
      })
    )
    expect(screen.getByText('Enable feature')).toBeInTheDocument()
    expect(screen.getByTestId('switch')).toBeChecked()
  })

  it('renders description when provided', () => {
    render(
      React.createElement(SettingsSwitchField, {
        checked: false,
        onCheckedChange: vi.fn(),
        label: 'Feature',
        description: 'A helpful description',
      })
    )
    expect(screen.getByText('A helpful description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(
      React.createElement(SettingsSwitchField, {
        checked: false,
        onCheckedChange: vi.fn(),
        label: 'Feature',
      })
    )
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})

describe('SettingsSwitchContent', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsSwitchContent, {}, 'Switch content')
    )
    expect(screen.getByText('Switch content')).toBeInTheDocument()
  })
})

describe('SettingsControlGroup', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsControlGroup, {}, 'Group content')
    )
    expect(screen.getByText('Group content')).toBeInTheDocument()
  })
})

describe('SettingsControlChildren', () => {
  it('renders children', () => {
    render(
      React.createElement(SettingsControlChildren, {}, 'Children content')
    )
    expect(screen.getByText('Children content')).toBeInTheDocument()
  })
})

describe('SettingsForm', () => {
  it('renders as a form element', () => {
    const { container } = render(
      React.createElement(SettingsForm, {}, 'Form content')
    )
    expect(container.querySelector('form')).toBeInTheDocument()
    expect(screen.getByText('Form content')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      React.createElement(SettingsForm, { className: 'form-custom' }, 'content')
    )
    expect(container.querySelector('form')?.className).toContain('form-custom')
  })
})

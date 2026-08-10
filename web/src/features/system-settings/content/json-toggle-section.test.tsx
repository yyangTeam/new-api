import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => undefined,
}))

vi.mock('@/components/json-code-editor', () => ({
  JsonCodeEditor: ({ value, onChange, placeholder }: any) =>
    React.createElement('textarea', {
      'data-testid': 'json-editor',
      value,
      onChange: (e: any) => onChange(e.target.value),
      placeholder,
    }),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => React.createElement('div', { 'data-testid': 'form' }, children),
  FormControl: ({ children }: any) => children,
  FormDescription: ({ children }: any) => React.createElement('p', {}, children),
  FormField: ({ render, name }: any) =>
    render({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: null, name } }),
  FormItem: ({ children }: any) => React.createElement('div', {}, children),
  FormLabel: ({ children }: any) => React.createElement('label', {}, children),
  FormMessage: () => null,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: () => onCheckedChange(!checked),
      'data-testid': 'switch',
    }),
}))

vi.mock('../components/settings-accordion', () => ({
  SettingsAccordion: ({ title, children }: any) =>
    React.createElement('div', { 'data-testid': 'accordion', title }, children),
}))

vi.mock('../components/settings-form-layout', () => ({
  SettingsForm: ({ children, onSubmit }: any) =>
    React.createElement('form', { onSubmit }, children),
  SettingsSwitchContent: ({ children }: any) => React.createElement('div', {}, children),
  SettingsSwitchItem: ({ children }: any) => React.createElement('div', {}, children),
}))

vi.mock('../components/settings-page-context', () => ({
  SettingsPageFormActions: () =>
    React.createElement('button', { 'data-testid': 'save-btn' }, 'Save'),
}))

vi.mock('../hooks/use-update-option', () => ({
  useUpdateOption: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

import { JsonToggleSection } from './json-toggle-section'

describe('JsonToggleSection', () => {
  const defaultProps = {
    value: 'test-section',
    title: 'Test Section',
    optionKey: 'console_setting.test',
    enabledKey: 'console_setting.test_enabled',
    defaultEnabled: true,
    defaultValue: '[]',
    textareaLabel: 'JSON Data',
  }

  it('renders accordion with title', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByTestId('accordion')).toHaveAttribute('title', 'Test Section')
  })

  it('renders the JSON editor', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByTestId('json-editor')).toBeInTheDocument()
  })

  it('renders the form', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  it('renders save actions button', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByTestId('save-btn')).toBeInTheDocument()
  })

  it('renders module availability label', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByText('Module availability')).toBeInTheDocument()
  })

  it('renders textarea label', () => {
    render(React.createElement(JsonToggleSection, defaultProps))
    expect(screen.getByText('JSON Data')).toBeInTheDocument()
  })

  it('renders toggle description when provided', () => {
    render(
      React.createElement(JsonToggleSection, {
        ...defaultProps,
        toggleDescription: 'Enable this feature',
      })
    )
    expect(screen.getByText('Enable this feature')).toBeInTheDocument()
  })

  it('renders textarea description when provided', () => {
    render(
      React.createElement(JsonToggleSection, {
        ...defaultProps,
        textareaDescription: 'Enter valid JSON',
      })
    )
    expect(screen.getByText('Enter valid JSON')).toBeInTheDocument()
  })

  it('renders example when provided', () => {
    render(
      React.createElement(JsonToggleSection, {
        ...defaultProps,
        example: '[{"key": "value"}]',
      })
    )
    expect(screen.getByText('[{"key": "value"}]')).toBeInTheDocument()
  })
})

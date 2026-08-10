import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { ChannelEditorLoadingState } from './channel-editor-loading-state'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid='skeleton' className={className} />
  ),
}))

describe('ChannelEditorLoadingState', () => {
  it('renders loading text', () => {
    render(<ChannelEditorLoadingState />)
    expect(screen.getByText('Loading channel details')).toBeInTheDocument()
  })

  it('renders help text', () => {
    render(<ChannelEditorLoadingState />)
    expect(
      screen.getByText(
        'Please wait before editing to avoid overwriting saved values.'
      )
    ).toBeInTheDocument()
  })

  it('renders skeleton placeholders', () => {
    render(<ChannelEditorLoadingState />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('has aria-live polite for accessibility', () => {
    const { container } = render(<ChannelEditorLoadingState />)
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})

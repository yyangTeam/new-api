import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// The two-step flow posts to /api/system/update then /api/system/restart.
const apiPost = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

// The lazy release-notes markdown renderer is irrelevant here; stub it.
vi.mock('@/components/ui/markdown', () => ({
  Markdown: (props: { children?: React.ReactNode }) =>
    React.createElement('div', null, props.children),
}))

import { SystemUpdateDialog } from '@/features/system-update/system-update-dialog'

function makeUpdate() {
  return {
    release: {
      tag_name: 'v1.2.0',
      html_url: 'https://example.com/releases/v1.2.0',
      published_at: '2024-01-01T00:00:00Z',
      prerelease: false,
      body: '',
    },
    snapshot: { lastCheckedAt: Date.now() },
    currentVersion: 'v1.1.0',
    comparison: -1,
    hasUpdate: true,
    isIgnored: false,
    online: true,
    checking: false,
    setIgnored: vi.fn(),
    checkNow: vi.fn(),
  } as unknown as Parameters<typeof SystemUpdateDialog>[0]['update']
}

function renderDialog() {
  return render(
    React.createElement(SystemUpdateDialog, {
      open: true,
      onOpenChange: vi.fn(),
      trigger: React.createElement('button', null, 'open'),
      update: makeUpdate(),
    })
  )
}

describe('SystemUpdateDialog two-step update flow', () => {
  it('downloads first, then swaps to a Restart-now action that restarts', async () => {
    apiPost.mockReset().mockResolvedValue({
      data: { success: true, data: { version: 'v1.2.0' }, need_restart: true },
    })
    const user = userEvent.setup()
    renderDialog()

    // Step 1: the action starts as a download, not an immediate restart.
    const downloadBtn = screen.getByRole('button', { name: 'Download update' })
    expect(
      screen.queryByRole('button', { name: 'Restart now' })
    ).not.toBeInTheDocument()

    await user.click(downloadBtn)

    // After the download call, the button becomes "Restart now" and the
    // staged-restart hint appears; the update endpoint was hit exactly once.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Restart now' })
      ).toBeInTheDocument()
    })
    expect(apiPost).toHaveBeenCalledWith('/api/system/update')
    expect(
      screen.queryByRole('button', { name: 'Download update' })
    ).not.toBeInTheDocument()

    // Step 2: clicking Restart now hits the restart endpoint.
    await user.click(screen.getByRole('button', { name: 'Restart now' }))
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/system/restart')
    })
  })
})

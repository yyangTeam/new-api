/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { fetchLatestSystemRelease } from '@/features/system-update/api'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

// The backend proxy returns the repository's published releases (including
// pre-releases) instead of GitHub's /releases/latest. fetchLatestSystemRelease
// must run that list through selectLatestRelease so a newer RC/Beta than the
// latest stable release is surfaced in the dashboard, restoring the upstream
// detection the dev proxy had dropped.
describe('fetchLatestSystemRelease', () => {
  test('surfaces a newer pre-release over an older stable release via the backend proxy', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            tag_name: 'v1.0.0',
            name: 'v1.0.0',
            body: 'stable',
            published_at: '2026-01-01T00:00:00Z',
            prerelease: false,
            draft: false,
          },
          {
            tag_name: 'v1.1.0-rc.1',
            name: 'v1.1.0-rc.1',
            body: 'rc',
            published_at: '2026-02-01T00:00:00Z',
            prerelease: true,
            draft: false,
          },
        ],
      },
    })

    const release = await fetchLatestSystemRelease(new AbortController().signal)

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/latest-release',
      expect.any(Object)
    )
    expect(release?.tag_name).toBe('v1.1.0-rc.1')
    expect(release?.prerelease).toBe(true)
  })

  test('keeps the stable release when no pre-release is newer', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { tag_name: 'v1.0.0', prerelease: false, draft: false },
          { tag_name: 'v0.9.0-rc.1', prerelease: true, draft: false },
        ],
      },
    })

    const release = await fetchLatestSystemRelease(new AbortController().signal)

    expect(release?.tag_name).toBe('v1.0.0')
    expect(release?.prerelease).toBe(false)
  })

  test('reports a payload error when the proxy returns a non-list body', async () => {
    mockApi.get.mockResolvedValue({
      data: { success: true, data: { not: 'a release list' } },
    })

    await expect(
      fetchLatestSystemRelease(new AbortController().signal)
    ).rejects.toMatchObject({ code: 'payload' })
  })
})

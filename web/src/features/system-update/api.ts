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
import { api } from '@/lib/api'

import { selectLatestRelease, type SystemRelease } from './releases'

export type UpdateCheckErrorCode =
  | 'network'
  | 'rate-limit'
  | 'timeout'
  | 'payload'

export class UpdateCheckError extends Error {
  constructor(public readonly code: UpdateCheckErrorCode) {
    super(code)
    this.name = 'UpdateCheckError'
  }
}

/**
 * Fetch the latest release via the backend proxy at /api/latest-release.
 *
 * The proxy returns the repository's published releases (including
 * pre-releases) so the dashboard can detect a newer RC/Beta than the latest
 * stable release without calling api.github.com from the browser, and uses
 * the fork's configured repository (UpdateCheckApiBase / UpdateCheckRepo)
 * instead of hardcoding the upstream repo. Selection runs client-side via
 * selectLatestRelease, matching upstream behavior.
 */
export async function fetchLatestSystemRelease(
  signal: AbortSignal
): Promise<SystemRelease | null> {
  try {
    const response = await api.get('/api/latest-release', { signal })
    const payload = response.data
    if (!payload?.success) {
      throw new UpdateCheckError('network')
    }
    try {
      return selectLatestRelease(payload.data)
    } catch (error) {
      if (signal.aborted) throw error
      throw new UpdateCheckError('payload')
    }
  } catch (error) {
    if (signal.aborted) throw error
    if (error instanceof UpdateCheckError) throw error
    throw new UpdateCheckError('network')
  }
}

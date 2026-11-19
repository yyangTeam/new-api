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

import {
  DEFAULT_RANKING_METRIC,
  DEFAULT_RANKING_PERIOD,
} from './constants'
import type {
  GetInviterRebateRankingsParams,
  GetInviterRebateRankingsResponse,
} from './types'

// ============================================================================
// Inviter Rebate Rankings (admin)
// ============================================================================

// Get the paginated inviter rebate ranking list.
// metric: rebate (by granted quota) | invitees (by invitee count)
// period: month | quarter | year | all (natural calendar alignment)
export async function getInviterRebateRankings(
  params: GetInviterRebateRankingsParams = {}
): Promise<GetInviterRebateRankingsResponse> {
  const {
    metric = DEFAULT_RANKING_METRIC,
    period = DEFAULT_RANKING_PERIOD,
    p = 1,
    page_size = 10,
  } = params
  const res = await api.get('/api/inviter_rebate/rankings', {
    params: { metric, period, p, page_size },
  })
  return res.data
}

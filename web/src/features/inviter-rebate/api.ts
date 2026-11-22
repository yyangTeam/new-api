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

import { DEFAULT_RANKING_METRIC, DEFAULT_RANKING_PERIOD } from './constants'
import type {
  GetInviterRebateLedgerParams,
  GetInviterRebateLedgerResponse,
  GetInviterRebateLedgerSummaryResponse,
  GetInviterRebateRankingsParams,
  GetInviterRebateRankingsResponse,
  InviterRebateAdminOpResponse,
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

// ============================================================================
// Inviter Rebate Ledger (admin)
// ============================================================================

// Build the shared ledger filter query params. Undefined/zero values are
// omitted so the backend treats them as "no filter".
function toLedgerQuery(params: GetInviterRebateLedgerParams) {
  const query: Record<string, number | string> = {}
  if (params.inviter_id && params.inviter_id > 0) {
    query.inviter_id = params.inviter_id
  }
  if (params.invitee_id && params.invitee_id > 0) {
    query.invitee_id = params.invitee_id
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.source_type) {
    query.source_type = params.source_type
  }
  return query
}

// Get the paginated inviter rebate ledger (newest first, id DESC).
export async function getInviterRebateLedger(
  params: GetInviterRebateLedgerParams
): Promise<GetInviterRebateLedgerResponse> {
  const res = await api.get('/api/inviter_rebate/ledger', {
    params: {
      ...toLedgerQuery(params),
      p: params.p ?? 1,
      page_size: params.page_size ?? 10,
    },
  })
  return res.data
}

// Get the ledger summary card aggregation for the current filters.
export async function getInviterRebateLedgerSummary(
  params: Omit<GetInviterRebateLedgerParams, 'p' | 'page_size'>
): Promise<GetInviterRebateLedgerSummaryResponse> {
  const res = await api.get('/api/inviter_rebate/ledger/summary', {
    params: toLedgerQuery(params),
  })
  return res.data
}

// Void a locked rebate row (admin decision, money never left the pool).
export async function voidInviterRebateLedgerRow(
  id: number
): Promise<InviterRebateAdminOpResponse> {
  const res = await api.post(`/api/inviter_rebate/ledger/${id}/void`)
  return res.data
}

// Release a locked rebate row to the inviter's transferable rebate pool.
export async function releaseInviterRebateLedgerRow(
  id: number
): Promise<InviterRebateAdminOpResponse> {
  const res = await api.post(`/api/inviter_rebate/ledger/${id}/release`)
  return res.data
}

// Claw back a rebate after the source recharge was refunded.
export async function clawbackInviterRebateLedgerRow(
  id: number
): Promise<InviterRebateAdminOpResponse> {
  const res = await api.post(`/api/inviter_rebate/ledger/${id}/clawback`)
  return res.data
}

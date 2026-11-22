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
import { z } from 'zod'

// ============================================================================
// Inviter Rebate Ranking Schema & Types
// ============================================================================

// One aggregated ranking row per inviter, produced by
// GET /api/inviter_rebate/rankings (admin only).
// granted_quota = released_quota + locked_quota (voided is tracked separately).
export const inviterRebateRankingRowSchema = z.object({
  inviter_id: z.number(),
  username: z.string(),
  display_name: z.string(),
  aff_count: z.number(),
  rebate_count: z.number(),
  invitee_count: z.number(),
  released_quota: z.number(),
  locked_quota: z.number(),
  voided_quota: z.number(),
  granted_quota: z.number(),
})

export type InviterRebateRankingRow = z.infer<
  typeof inviterRebateRankingRowSchema
>

// ============================================================================
// Inviter Rebate Ledger Schema & Types (admin)
// ============================================================================

// One ledger row per rebate grant, produced by
// GET /api/inviter_rebate/ledger (admin only). Both usernames are empty
// strings when the account was hard-deleted (render as "Deleted User").
// locked_reason / voided_reason are admin-visible fields (the A-side
// endpoints never expose them).
export const inviterRebateLedgerRowSchema = z.object({
  id: z.number(),
  created_at: z.number(),
  inviter_id: z.number(),
  inviter_username: z.string(),
  invitee_id: z.number(),
  invitee_username: z.string(),
  source_type: z.string(),
  source_id: z.number(),
  base_quota: z.number(),
  percent: z.number(),
  quota: z.number(),
  status: z.string(),
  locked_reason: z.string(),
  voided_reason: z.string(),
  released_at: z.number(),
})

export type InviterRebateLedgerRow = z.infer<
  typeof inviterRebateLedgerRowSchema
>

// Summary card aggregation produced by GET /api/inviter_rebate/ledger/summary.
// granted = released + locked (voided tracked separately); the suspect
// columns aggregate locked(self_invite_suspect) rows for manual review.
export interface InviterRebateLedgerSummary {
  rebate_count: number
  released_quota: number
  locked_quota: number
  voided_quota: number
  granted_quota: number
  suspect_count: number
  suspect_locked_quota: number
}

// Result of POST /api/inviter_rebate/ledger/:id/{void,release,clawback}.
// quota is the amount that actually moved (0 when nothing moved);
// debt is the unrecovered remainder for underfunded clawbacks.
export interface InviterRebateAdminOpResult {
  row: InviterRebateLedgerRow
  inviter_id: number
  quota: number
  debt: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetInviterRebateRankingsParams {
  metric?: string
  period?: string
  p?: number
  page_size?: number
}

export interface GetInviterRebateRankingsResponse {
  success: boolean
  message?: string
  data?: {
    items: InviterRebateRankingRow[]
    total: number
    page: number
    page_size: number
  }
}

// Zero/undefined values mean "no filter" on the backend.
export interface GetInviterRebateLedgerParams {
  inviter_id?: number
  invitee_id?: number
  status?: string
  source_type?: string
  p?: number
  page_size?: number
}

export interface GetInviterRebateLedgerResponse {
  success: boolean
  message?: string
  data?: {
    items: InviterRebateLedgerRow[]
    total: number
    page: number
    page_size: number
  }
}

export interface GetInviterRebateLedgerSummaryResponse {
  success: boolean
  message?: string
  data?: InviterRebateLedgerSummary
}

export interface InviterRebateAdminOpResponse {
  success: boolean
  message?: string
  data?: InviterRebateAdminOpResult
}

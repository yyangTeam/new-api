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

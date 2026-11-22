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

// Mirrors model.InviterRebateRankingMetric* backend constants.
export const RANKING_METRIC_VALUES = ['rebate', 'invitees'] as const
export type RankingMetric = (typeof RANKING_METRIC_VALUES)[number]

// Mirrors model.InviterRebateRankingPeriod* backend constants.
export const RANKING_PERIOD_VALUES = [
  'month',
  'quarter',
  'year',
  'all',
] as const
export type RankingPeriod = (typeof RANKING_PERIOD_VALUES)[number]

export const DEFAULT_RANKING_METRIC: RankingMetric = 'rebate'
export const DEFAULT_RANKING_PERIOD: RankingPeriod = 'month'

type Option = {
  labelKey: string
  descriptionKey?: string
}

export const RANKING_METRICS: Record<RankingMetric, Option> = {
  rebate: {
    labelKey: 'Rebate Amount',
    descriptionKey:
      'Rank inviters by granted rebate quota (released + locked).',
  },
  invitees: {
    labelKey: 'Invitee Count',
    descriptionKey: 'Rank inviters by the number of invitees with rebates.',
  },
}

export const RANKING_PERIODS: Record<RankingPeriod, Option> = {
  month: { labelKey: 'This Month' },
  quarter: { labelKey: 'This Quarter' },
  year: { labelKey: 'This Year' },
  all: { labelKey: 'All Time' },
}

type TranslateFn = (key: string) => string

export function getRankingMetricOptions(
  t: TranslateFn
): Array<{ value: RankingMetric; label: string }> {
  return RANKING_METRIC_VALUES.map((value) => ({
    value,
    label: t(RANKING_METRICS[value].labelKey),
  }))
}

export function getRankingPeriodOptions(
  t: TranslateFn
): Array<{ value: RankingPeriod; label: string }> {
  return RANKING_PERIOD_VALUES.map((value) => ({
    value,
    label: t(RANKING_PERIODS[value].labelKey),
  }))
}

// ============================================================================
// Inviter Rebate Ledger (admin)
// ============================================================================

// Mirrors model.InviterRebateStatus* backend constants.
export const LEDGER_STATUS_VALUES = ['released', 'locked', 'voided'] as const
export type LedgerStatus = (typeof LEDGER_STATUS_VALUES)[number]

// Mirrors model.InviterRebateSource* backend constants.
export const LEDGER_SOURCE_TYPE_VALUES = ['topup', 'redemption'] as const
export type LedgerSourceType = (typeof LEDGER_SOURCE_TYPE_VALUES)[number]

// Mirrors model.InviterRebateLocked* backend constants.
const LEDGER_LOCKED_REASONS: Record<string, string> = {
  awaiting_consume: 'Awaiting consumption unlock',
  self_invite_suspect: 'Self-invite suspicion',
}

// Mirrors model.InviterRebateVoided* backend constants.
const LEDGER_VOIDED_REASONS: Record<string, string> = {
  inviter_missing: 'Inviter missing',
  monthly_cap: 'Monthly cap reached',
  lock_expired: 'Lock expired',
  admin_void: 'Voided by admin',
  refund: 'Source recharge refunded',
  refund_underfunded: 'Source recharge refunded, inviter underfunded',
}

export function getLedgerReasonLabel(
  t: TranslateFn,
  status: string,
  reason: string
): string {
  if (status === 'locked' && reason) {
    return t(LEDGER_LOCKED_REASONS[reason] ?? reason)
  }
  if (status === 'voided' && reason) {
    return t(LEDGER_VOIDED_REASONS[reason] ?? reason)
  }
  return ''
}

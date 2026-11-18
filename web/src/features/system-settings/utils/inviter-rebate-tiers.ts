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
import { isArray, isObjectRecord } from './json-validators'

export interface InviterRebateTier {
  min_invitees: number
  percent: number
}

// Mirrors inviterRebateMaxTiers in setting/operation_setting/inviter_rebate_setting.go
export const INVITER_REBATE_MAX_TIERS = 20

export type InviterRebateTiersValidation =
  | { valid: true }
  | { valid: false; messageKey: string; params?: Record<string, number> }

function isEmptyTiersValue(value: string | undefined | null): boolean {
  const trimmed = (value ?? '').trim()
  return trimmed === '' || trimmed === 'null'
}

/**
 * Parse the inviter rebate tiers option value into rows for display.
 * Invalid or empty values (empty / null / not a JSON array / bad rows)
 * degrade to an empty table, matching the backend runtime fallback.
 */
export function parseInviterRebateTiers(
  value: string | undefined | null
): InviterRebateTier[] {
  if (isEmptyTiersValue(value)) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse((value ?? '').trim())
  } catch {
    return []
  }
  if (!isArray(parsed)) {
    return []
  }

  return parsed
    .filter(isObjectRecord)
    .map((item) => ({
      min_invitees: Number(item.min_invitees),
      percent: Number(item.percent),
    }))
    .filter(
      (tier) =>
        Number.isInteger(tier.min_invitees) && Number.isInteger(tier.percent)
    )
}

/**
 * Validate the tiers option string with the same rules as the backend
 * (ValidateInviterRebateTiersJSON): empty / null / [] are legal (tiers off),
 * at most 20 tiers, integer percent 0-100, non-negative integer
 * min_invitees, strictly increasing min_invitees order.
 */
export function validateInviterRebateTiers(
  value: string | undefined | null
): InviterRebateTiersValidation {
  if (isEmptyTiersValue(value)) {
    return { valid: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse((value ?? '').trim())
  } catch {
    return {
      valid: false,
      messageKey: 'Inviter rebate tiers must be a JSON array',
    }
  }
  if (!isArray(parsed)) {
    return {
      valid: false,
      messageKey: 'Inviter rebate tiers must be a JSON array',
    }
  }

  if (parsed.length > INVITER_REBATE_MAX_TIERS) {
    return {
      valid: false,
      messageKey: 'Inviter rebate tiers must contain at most {{count}} tiers',
      params: { count: INVITER_REBATE_MAX_TIERS },
    }
  }

  let previousMinInvitees = -1
  for (const item of parsed) {
    if (!isObjectRecord(item)) {
      return {
        valid: false,
        messageKey: 'Inviter rebate tiers must be a JSON array',
      }
    }

    const { min_invitees: minInvitees, percent } = item
    if (
      typeof percent !== 'number' ||
      !Number.isInteger(percent) ||
      percent < 0 ||
      percent > 100
    ) {
      return {
        valid: false,
        messageKey:
          'Inviter rebate tier percent must be an integer between 0 and 100',
      }
    }
    if (
      typeof minInvitees !== 'number' ||
      !Number.isInteger(minInvitees) ||
      minInvitees < 0
    ) {
      return {
        valid: false,
        messageKey:
          'Inviter rebate tier minimum invitees must be a non-negative integer',
      }
    }
    if (minInvitees <= previousMinInvitees) {
      return {
        valid: false,
        messageKey:
          'Inviter rebate tiers must be ordered by strictly increasing minimum invitees',
      }
    }
    previousMinInvitees = minInvitees
  }

  return { valid: true }
}

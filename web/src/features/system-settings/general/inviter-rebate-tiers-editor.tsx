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
import { Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  INVITER_REBATE_MAX_TIERS,
  parseInviterRebateTiers,
  type InviterRebateTier,
} from '../utils/inviter-rebate-tiers'

type InviterRebateTiersEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

type TierField = keyof InviterRebateTier

function serializeTiers(tiers: InviterRebateTier[]): string {
  return JSON.stringify(
    tiers.map((tier) => ({
      min_invitees: tier.min_invitees,
      percent: tier.percent,
    })),
    null,
    2
  )
}

/**
 * Visual editor for the `inviter_rebate_setting.tiers` option. The form field
 * holds the raw JSON string (like payment amount options); this component
 * parses it into rows and re-serializes on every edit. Removing the last row
 * serializes to `[]`, which disables tiers server-side.
 */
export function InviterRebateTiersEditor({
  value,
  onChange,
  disabled = false,
}: InviterRebateTiersEditorProps) {
  const { t } = useTranslation()

  const tiers = useMemo(() => parseInviterRebateTiers(value), [value])

  const commitTiers = (next: InviterRebateTier[]) => {
    onChange(serializeTiers(next))
  }

  const handleFieldChange = (index: number, field: TierField, raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    const next = tiers.map((tier, i) =>
      i === index
        ? { ...tier, [field]: Number.isNaN(parsed) ? 0 : parsed }
        : tier
    )
    commitTiers(next)
  }

  const handleRemove = (index: number) => {
    commitTiers(tiers.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    const lastTier = tiers.at(-1)
    const nextMinInvitees = lastTier ? lastTier.min_invitees + 1 : 0
    commitTiers([...tiers, { min_invitees: nextMinInvitees, percent: 0 }])
  }

  return (
    <div className='space-y-3'>
      {tiers.length === 0 ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
          {t(
            'No rebate tiers configured. The flat rebate percent applies. Add a tier below to get started.'
          )}
        </div>
      ) : (
        <div className='space-y-2'>
          <div className='text-muted-foreground grid grid-cols-[1fr_1fr_auto] gap-2 text-sm'>
            <span>{t('Minimum invitees')}</span>
            <span>{t('Rebate percent')}</span>
            <span aria-hidden='true' />
          </div>
          {tiers.map((tier, index) => (
            <div
              // Row identity is positional: keys derived from tier contents
              // would remount the inputs and drop focus on every keystroke.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className='grid grid-cols-[1fr_1fr_auto] items-center gap-2'
            >
              <Input
                type='number'
                min={0}
                step={1}
                disabled={disabled}
                aria-label={`${t('Minimum invitees')} ${index + 1}`}
                value={tier.min_invitees}
                onChange={(event) =>
                  handleFieldChange(index, 'min_invitees', event.target.value)
                }
              />
              <Input
                type='number'
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                aria-label={`${t('Rebate percent')} ${index + 1}`}
                value={tier.percent}
                onChange={(event) =>
                  handleFieldChange(index, 'percent', event.target.value)
                }
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={disabled}
                aria-label={`${t('Remove tier')} ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleRemove(index)
                }}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type='button'
        variant='outline'
        disabled={disabled || tiers.length >= INVITER_REBATE_MAX_TIERS}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          handleAdd()
        }}
      >
        <Plus className='h-4 w-4' />
        <span>{t('Add tier')}</span>
      </Button>
    </div>
  )
}

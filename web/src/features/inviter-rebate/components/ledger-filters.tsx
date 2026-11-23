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
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { LedgerSourceType, LedgerStatus } from '../constants'

const route = getRouteApi('/_authenticated/inviter-rebate/ledger')

// Ledger filters are URL-driven (page resets on every change). The two id
// inputs are plain numbers: they commit on Enter/blur so typing does not
// trigger a request per keystroke.
export function LedgerFilters() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const updateSearch = (changes: {
    status?: LedgerStatus | undefined
    sourceType?: LedgerSourceType | undefined
    inviterId?: number | undefined
    inviteeId?: number | undefined
  }) => {
    navigate({
      search: (prev) => ({ ...prev, ...changes, page: undefined }),
      replace: true,
    })
  }

  // Rebate-scoped keys: the bare 'Released'/'Locked'/'Voided' keys carry
  // publish/changelog semantics in other locales (zh renders 发布于).
  const statusOptions = [
    { value: 'released', label: t('Released rebate') },
    { value: 'locked', label: t('Locked rebate') },
    { value: 'voided', label: t('Voided rebate') },
  ]
  const sourceTypeOptions = [
    { value: 'topup', label: t('Top-up') },
    { value: 'redemption', label: t('Redemption') },
  ]

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <IdFilterInput
        label={t('Inviter ID')}
        value={search.inviterId}
        onCommit={(inviterId) => updateSearch({ inviterId })}
      />
      <IdFilterInput
        label={t('Invitee ID')}
        value={search.inviteeId}
        onCommit={(inviteeId) => updateSearch({ inviteeId })}
      />
      <Select
        value={search.status ?? ''}
        onValueChange={(value) =>
          updateSearch({
            status: value === '' ? undefined : (value as LedgerStatus),
          })
        }
        items={statusOptions}
      >
        <SelectTrigger
          id='inviter-rebate-ledger-status'
          className='h-8 w-[120px]'
          aria-label={t('Status')}
        >
          <SelectValue placeholder={t('All Statuses')} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectItem value=''>{t('All Statuses')}</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={search.sourceType ?? ''}
        onValueChange={(value) =>
          updateSearch({
            sourceType: value === '' ? undefined : (value as LedgerSourceType),
          })
        }
        items={sourceTypeOptions}
      >
        <SelectTrigger
          id='inviter-rebate-ledger-source-type'
          className='h-8 w-[130px]'
          aria-label={t('Source Type')}
        >
          <SelectValue placeholder={t('All Sources')} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectItem value=''>{t('All Sources')}</SelectItem>
            {sourceTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

// Numeric id filter with commit semantics: an empty input clears the filter,
// an invalid (non-integer or non-positive) input is dropped, and only a
// changed valid value navigates. Enter commits by blurring.
function IdFilterInput(props: {
  label: string
  value: number | undefined
  onCommit: (value: number | undefined) => void
}) {
  const [draft, setDraft] = useState<string>()
  const shown = draft ?? (props.value !== undefined ? String(props.value) : '')
  useEffect(() => {
    setDraft(undefined)
  }, [props.value])

  const commit = () => {
    const raw = shown.trim()
    if (raw === '') {
      if (props.value !== undefined) {
        props.onCommit(undefined)
      }
    } else {
      const parsed = Number(raw)
      if (Number.isInteger(parsed) && parsed > 0 && parsed !== props.value) {
        props.onCommit(parsed)
      }
    }
    setDraft(undefined)
  }

  return (
    <Input
      type='number'
      inputMode='numeric'
      min={1}
      aria-label={props.label}
      placeholder={props.label}
      className='h-8 w-[110px]'
      value={shown}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          ;(event.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

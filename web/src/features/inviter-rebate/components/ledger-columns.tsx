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
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { StatusBadge, type StatusVariant } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import { Button } from '@/components/ui/button'
import { formatNumber, formatQuota } from '@/lib/format'

import { getLedgerReasonLabel } from '../constants'
import type { InviterRebateLedgerRow } from '../types'

export type LedgerRowAction = 'void' | 'release' | 'clawback'

// Status colors follow the shared badge variants: locked needs review
// (warning), voided lost the rebate (danger), released is the normal state.
// Labels use rebate-scoped keys: the bare 'Released'/'Locked'/'Voided' keys
// collide with changelog/publish semantics in other locales (zh shows
// 发布于 for 'Released').
const statusConfig: Record<string, { label: string; variant: StatusVariant }> =
  {
    locked: { label: 'Locked rebate', variant: 'warning' },
    released: { label: 'Released rebate', variant: 'neutral' },
    voided: { label: 'Voided rebate', variant: 'danger' },
  }

// All ordering is server-side (id DESC, newest first), so every column opts
// out of client-side sorting.
export function useLedgerColumns(props: {
  onAction: (action: LedgerRowAction, record: InviterRebateLedgerRow) => void
}): ColumnDef<InviterRebateLedgerRow>[] {
  const { t } = useTranslation()
  const onAction = props.onAction

  return [
    {
      accessorKey: 'id',
      header: t('ID'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <TableId value={row.getValue('id') as number} className='w-[70px]' />
      ),
      enableSorting: false,
      size: 90,
    },
    {
      accessorKey: 'created_at',
      header: t('Created At'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm whitespace-nowrap'>
          {dayjs
            .unix(row.getValue('created_at') as number)
            .format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
      enableSorting: false,
      size: 170,
    },
    {
      id: 'inviter',
      accessorFn: (row) => row.inviter_username,
      header: t('Inviter'),
      meta: { mobileTitle: true },
      cell: ({ row }) =>
        renderUserCell(
          t,
          row.original.inviter_id,
          row.original.inviter_username
        ),
      enableSorting: false,
      size: 180,
    },
    {
      id: 'invitee',
      accessorFn: (row) => row.invitee_username,
      header: t('Invitee'),
      meta: { mobileHidden: true },
      cell: ({ row }) =>
        renderUserCell(
          t,
          row.original.invitee_id,
          row.original.invitee_username
        ),
      enableSorting: false,
      size: 180,
    },
    {
      id: 'source',
      accessorFn: (row) => row.source_type,
      header: t('Source'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='inline-flex items-center gap-1.5 text-sm'>
          {row.original.source_type === 'redemption'
            ? t('Redemption')
            : t('Top-up')}
          <TableId value={row.original.source_id} />
        </span>
      ),
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: 'base_quota',
      header: t('Recharge Amount'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatQuota(row.getValue('base_quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'percent',
      header: t('Rate'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatNumber(row.getValue('percent') as number)}%
        </span>
      ),
      enableSorting: false,
      size: 80,
    },
    {
      accessorKey: 'quota',
      header: t('Rebate Amount'),
      meta: { mobileBadge: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm font-medium tabular-nums'>
          {formatQuota(row.getValue('quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => {
        const {
          status,
          locked_reason: lockedReason,
          voided_reason: voidedReason,
        } = row.original
        const reason = getLedgerReasonLabel(
          t,
          status,
          status === 'locked' ? lockedReason : voidedReason
        )
        const config = statusConfig[status] ?? statusConfig.released
        return (
          <div className='flex min-w-0 flex-col gap-1'>
            <StatusBadge
              label={t(config.label)}
              variant={config.variant}
              copyable={false}
              className='font-normal'
            />
            {reason ? (
              <span className='text-muted-foreground truncate text-xs'>
                {reason}
              </span>
            ) : null}
          </div>
        )
      },
      enableSorting: false,
      size: 150,
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      meta: { pinned: 'right' as const },
      cell: ({ row }) => {
        const record = row.original
        if (record.status === 'locked') {
          return (
            <div className='flex items-center gap-1.5'>
              <Button
                variant='destructive'
                size='xs'
                onClick={() => onAction('void', record)}
              >
                {t('Void')}
              </Button>
              <Button
                variant='outline'
                size='xs'
                onClick={() => onAction('release', record)}
              >
                {t('Release')}
              </Button>
            </div>
          )
        }
        if (record.status === 'released') {
          return (
            <Button
              variant='outline'
              size='xs'
              onClick={() => onAction('clawback', record)}
            >
              {t('Clawback')}
            </Button>
          )
        }
        return (
          <span className='text-muted-foreground text-sm' aria-hidden='true'>
            —
          </span>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 170,
    },
  ]
}

// Hard-deleted users keep their ledger rows with empty username fields.
function renderUserCell(
  t: (key: string) => string,
  userId: number,
  username: string
) {
  if (!username) {
    return (
      <span className='text-muted-foreground inline-flex items-center gap-1.5 text-sm'>
        {t('Deleted User')}
        <TableId value={userId} />
      </span>
    )
  }
  return (
    <div className='flex min-w-0 flex-col'>
      <span className='truncate font-medium'>{username}</span>
      <span className='text-muted-foreground truncate text-xs'>
        {`#${userId}`}
      </span>
    </div>
  )
}

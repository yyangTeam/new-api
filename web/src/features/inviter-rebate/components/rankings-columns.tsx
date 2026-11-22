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
import { useTranslation } from 'react-i18next'

import { TableId } from '@/components/table-id'
import { formatNumber, formatQuota } from '@/lib/format'

import type { InviterRebateRankingRow } from '../types'

// All ordering is server-side (metric column DESC, inviter_id ASC tiebreak),
// so every column opts out of client-side sorting.
export function useRankingsColumns(): ColumnDef<InviterRebateRankingRow>[] {
  const { t } = useTranslation()
  return [
    {
      id: 'rank',
      header: () => t('Rank'),
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const rank = row.index + 1 + pageIndex * pageSize
        return <TableId value={rank} className='w-[48px]' />
      },
      enableSorting: false,
      enableHiding: false,
      size: 64,
    },
    {
      id: 'inviter',
      accessorFn: (row) => row.display_name || row.username,
      header: t('Inviter'),
      meta: { mobileTitle: true },
      cell: ({ row }) => {
        const {
          inviter_id: inviterId,
          username,
          display_name: displayName,
        } = row.original
        const name = displayName || username

        // Hard-deleted inviters keep their ledger rows with empty user fields.
        if (!name) {
          return (
            <span className='text-muted-foreground inline-flex items-center gap-1.5 text-sm'>
              {t('Deleted User')}
              <TableId value={inviterId} />
            </span>
          )
        }

        return (
          <div className='flex min-w-0 flex-col'>
            <span className='truncate font-medium'>{name}</span>
            <span className='text-muted-foreground truncate text-xs'>
              {username && username !== name ? username : `#${inviterId}`}
            </span>
          </div>
        )
      },
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: 'aff_count',
      header: t('Bound Invitees'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatNumber(row.getValue('aff_count') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'invitee_count',
      header: t('Rebated Invitees'),
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatNumber(row.getValue('invitee_count') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'rebate_count',
      header: t('Rebate Records'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatNumber(row.getValue('rebate_count') as number)}
        </span>
      ),
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: 'granted_quota',
      header: t('Rebate Total'),
      meta: { mobileBadge: true },
      cell: ({ row }) => (
        <span className='font-mono text-sm font-medium tabular-nums'>
          {formatQuota(row.getValue('granted_quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: 'released_quota',
      header: t('Released'),
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums'>
          {formatQuota(row.getValue('released_quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'locked_quota',
      header: t('Locked'),
      cell: ({ row }) => (
        <span className='font-mono text-sm text-amber-600 tabular-nums dark:text-amber-400'>
          {formatQuota(row.getValue('locked_quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: 'voided_quota',
      header: t('Voided'),
      meta: { mobileHidden: true },
      cell: ({ row }) => (
        <span className='text-muted-foreground font-mono text-sm tabular-nums'>
          {formatQuota(row.getValue('voided_quota') as number)}
        </span>
      ),
      enableSorting: false,
      size: 110,
    },
  ]
}

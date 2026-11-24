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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { ErrorState } from '@/components/error-state'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import { useInviterRebateInvitees } from '../hooks/use-inviter-rebate'
import type { InviterRebateInvitee } from '../types'

export function InviterRebateInvitees(props: {
  userId: number
  affiliateLink?: string
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const query = useInviterRebateInvitees(
    props.userId,
    pagination.pageIndex + 1,
    pagination.pageSize
  )
  const amountColumns: {
    key: 'granted_quota' | 'released_quota' | 'locked_quota' | 'voided_quota'
    label: string
  }[] = [
    { key: 'granted_quota', label: t('Rebate Total') },
    { key: 'released_quota', label: t('Released rebates') },
    { key: 'locked_quota', label: t('Locked rebates') },
    { key: 'voided_quota', label: t('Voided') },
  ]
  const columns: ColumnDef<InviterRebateInvitee>[] = [
    {
      accessorKey: 'invitee_masked_name',
      header: t('Invitee'),
      enableSorting: false,
      meta: { mobileTitle: true },
      cell: ({ row }) => (
        <span
          className='block max-w-48 truncate font-medium'
          title={row.original.invitee_masked_name || t('Deleted User')}
        >
          {row.original.invitee_masked_name || t('Deleted User')}
        </span>
      ),
    },
    ...amountColumns.map((amount): ColumnDef<InviterRebateInvitee> => ({
      accessorKey: amount.key,
      header: amount.label,
      enableSorting: false,
      cell: ({ row }) => (
        <span className='block font-mono text-sm break-all tabular-nums'>
          {formatQuotaWithCurrency(row.original[amount.key], { locale })}
        </span>
      ),
    })),
    {
      accessorKey: 'rebate_count',
      header: t('Rebate Records'),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='block font-mono text-sm break-all tabular-nums'>
          {formatNumber(row.original.rebate_count, locale)}
        </span>
      ),
    },
  ]
  const { table } = useDataTable({
    data: query.data?.items ?? [],
    columns,
    totalCount: query.data?.total ?? 0,
    pagination,
    onPaginationChange: setPagination,
    manualPagination: true,
    enableRowSelection: false,
    // The API has no public IDs; read-only rows use page positions, not masked names.
    getRowId: (_row, index) =>
      String(pagination.pageIndex * pagination.pageSize + index),
    ensurePageInRange: (count) => {
      if (
        !query.isPending &&
        !query.isError &&
        !query.isPlaceholderData &&
        pagination.pageIndex > 0 &&
        pagination.pageIndex >= count
      ) {
        setPagination((current) => ({
          ...current,
          pageIndex: Math.max(0, count - 1),
        }))
      }
    },
  })

  return (
    <section
      aria-label={t('Invitee contributions')}
      aria-busy={query.isFetching}
      className='flex min-w-0 flex-col gap-3'
    >
      <div>
        <h4 className='text-sm font-semibold'>{t('Invitee contributions')}</h4>
        <p className='text-muted-foreground mt-1 text-xs'>
          {t(
            'Masked invitees with recorded rebates, ordered by total contribution. Each invitee may have multiple rebate states.'
          )}
        </p>
      </div>
      {query.isError ? (
        <ErrorState
          title={t('Failed to load invitee contributions')}
          onRetry={() => void query.refetch()}
          className='min-h-0 py-6'
        />
      ) : (
        <DataTablePage
          table={table}
          columns={columns}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          fixedHeight={false}
          paginationInFooter={false}
          compactPagination
          toolbarProps={null}
          emptyTitle={t('No invitee contributions yet')}
          emptyDescription={t(
            'Invitees appear here after their first recorded recharge rebate. This list does not include every registered invitee.'
          )}
          emptyAction={
            props.affiliateLink ? (
              <CopyButton
                value={props.affiliateLink}
                variant='outline'
                size='default'
                className='min-h-11'
                iconClassName='size-4'
                aria-label={t('Copy invitation link')}
              >
                {t('Copy invitation link')}
              </CopyButton>
            ) : null
          }
        />
      )}
    </section>
  )
}

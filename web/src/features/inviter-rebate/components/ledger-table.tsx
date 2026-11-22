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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { useMediaQuery } from '@/hooks'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { formatQuota } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { createServerError } from '@/lib/server-error-message'

import {
  clawbackInviterRebateLedgerRow,
  getInviterRebateLedger,
  releaseInviterRebateLedgerRow,
  voidInviterRebateLedgerRow,
} from '../api'
import type {
  InviterRebateAdminOpResponse,
  InviterRebateAdminOpResult,
  InviterRebateLedgerRow,
} from '../types'
import { useLedgerColumns, type LedgerRowAction } from './ledger-columns'

const route = getRouteApi('/_authenticated/inviter-rebate/ledger')

type PendingAction = {
  action: LedgerRowAction
  record: InviterRebateLedgerRow
}

export function LedgerTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const search = route.useSearch()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const columns = useLedgerColumns({
    onAction: (action, record) => setPending({ action, record }),
  })

  const { pagination, onPaginationChange, ensurePageInRange } =
    useTableUrlState({
      search,
      navigate: route.useNavigate(),
      pagination: { defaultPage: 1, defaultPageSize: isMobile ? 10 : 20 },
    })

  const filters = {
    inviter_id: search.inviterId,
    invitee_id: search.inviteeId,
    status: search.status,
    source_type: search.sourceType,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'inviter-rebate-ledger',
      ...Object.values(filters),
      pagination.pageIndex + 1,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const result = await getInviterRebateLedger({
        ...filters,
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      })
      if (!result.success) {
        throw createServerError(
          result,
          t('Failed to load inviter rebate ledger')
        )
      }
      return {
        items: result.data?.items || [],
        total: result.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const rows = data?.items || []

  const { table } = useDataTable({
    data: rows,
    columns,
    getRowId: (row) => String(row.id),
    pagination,
    onPaginationChange,
    manualPagination: true,
    totalCount: data?.total || 0,
    ensurePageInRange,
  })

  // Row actions change both the ledger and the summary aggregation, so both
  // query families are invalidated together.
  const invalidateLedger = () => {
    void queryClient.invalidateQueries({ queryKey: ['inviter-rebate-ledger'] })
    void queryClient.invalidateQueries({
      queryKey: ['inviter-rebate-ledger-summary'],
    })
  }

  const handleConfirm = async () => {
    if (!pending) return
    const { action, record } = pending

    setIsSubmitting(true)
    try {
      let result: InviterRebateAdminOpResponse
      if (action === 'void') {
        result = await voidInviterRebateLedgerRow(record.id)
      } else if (action === 'release') {
        result = await releaseInviterRebateLedgerRow(record.id)
      } else {
        result = await clawbackInviterRebateLedgerRow(record.id)
      }
      if (result.success) {
        toast.success(
          t(getActionSuccessKey(action, result.data), {
            quota: formatQuota(result.data?.quota ?? record.quota),
          })
        )
        setPending(null)
        invalidateLedger()
      } else {
        handleServerError(result, t(getActionFailureKey(action)))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const dialogConfig = pending
    ? getDialogConfig(t, pending, isSubmitting)
    : null

  return (
    <>
      <DataTablePage
        table={table}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyTitle={t('No Inviter Rebate Records Found')}
        emptyDescription={t(
          'No inviter rebate ledger records match the current filters. Adjust the filters to see more.'
        )}
        skeletonKeyPrefix='inviter-rebate-ledger-skeleton'
        applyHeaderSize
        toolbarProps={null}
      />
      {pending && dialogConfig ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={dialogConfig.title}
          desc={dialogConfig.desc}
          confirmText={dialogConfig.confirmText}
          destructive={pending.action === 'void'}
          isLoading={isSubmitting}
          handleConfirm={handleConfirm}
        />
      ) : null}
    </>
  )
}

type DialogConfig = {
  title: string
  desc: React.JSX.Element | string
  confirmText: string
}

function getDialogConfig(
  t: (key: string, options?: Record<string, unknown>) => string,
  pending: PendingAction,
  isSubmitting: boolean
): DialogConfig {
  const { action, record } = pending
  const inviter = record.inviter_username || t('Deleted User')
  const values = {
    quota: formatQuota(record.quota),
    name: inviter,
  }

  if (action === 'void') {
    return {
      title: t('Void this rebate?'),
      desc: (
        <>
          {t(
            'This voids the locked rebate {{quota}} for inviter {{name}}. The rebate never leaves the locked pool. This action cannot be undone.',
            values
          )}
        </>
      ),
      confirmText: isSubmitting ? t('Voiding...') : t('Void'),
    }
  }
  if (action === 'release') {
    return {
      title: t('Release this rebate?'),
      desc: (
        <>
          {t(
            'This releases the locked rebate {{quota}} to the inviter {{name}}.',
            values
          )}
        </>
      ),
      confirmText: isSubmitting ? t('Releasing...') : t('Release'),
    }
  }
  return {
    title: t('Claw back this rebate?'),
    desc: (
      <>
        {t(
          'This deducts the released rebate {{quota}} from the inviter {{name}}. Use it after the source recharge was refunded.',
          values
        )}
      </>
    ),
    confirmText: isSubmitting ? t('Clawing back...') : t('Clawback'),
  }
}

// Success toasts reuse the backend log message keys where one exists, with
// the quota interpolated the same way the backend formats it.
function getActionSuccessKey(
  action: LedgerRowAction,
  result?: InviterRebateAdminOpResult
): string {
  if (action === 'void') {
    return 'Invitation rebate {{quota}} voided by manual review'
  }
  if (action === 'release') {
    return 'Invitation rebate {{quota}} released after manual review'
  }
  if (result && result.debt > 0) {
    return 'Invitation rebate {{quota}} debt outstanding after refund clawback, manual review required'
  }
  return 'Invitation rebate {{quota}} recovered due to invitee refund'
}

function getActionFailureKey(action: LedgerRowAction): string {
  if (action === 'void') {
    return 'Failed to void the rebate record'
  }
  if (action === 'release') {
    return 'Failed to release the rebate record'
  }
  return 'Failed to claw back the rebate record'
}

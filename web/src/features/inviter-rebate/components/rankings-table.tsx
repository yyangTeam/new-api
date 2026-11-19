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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { useMediaQuery } from '@/hooks'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { createServerError } from '@/lib/server-error-message'

import { getInviterRebateRankings } from '../api'
import {
  DEFAULT_RANKING_METRIC,
  DEFAULT_RANKING_PERIOD,
} from '../constants'
import { useRankingsColumns } from './rankings-columns'

const route = getRouteApi('/_authenticated/inviter-rebate/')

export function RankingsTable() {
  const { t } = useTranslation()
  const columns = useRankingsColumns()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const search = route.useSearch()
  const metric = search.metric ?? DEFAULT_RANKING_METRIC
  const period = search.period ?? DEFAULT_RANKING_PERIOD

  const { pagination, onPaginationChange, ensurePageInRange } =
    useTableUrlState({
      search,
      navigate: route.useNavigate(),
      pagination: { defaultPage: 1, defaultPageSize: isMobile ? 10 : 20 },
    })

  // Fetch data with React Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'inviter-rebate-rankings',
      metric,
      period,
      pagination.pageIndex + 1,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const result = await getInviterRebateRankings({
        metric,
        period,
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      })

      if (!result.success) {
        throw createServerError(
          result,
          t('Failed to load inviter rebate rankings')
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
    getRowId: (row) => String(row.inviter_id),
    pagination,
    onPaginationChange,
    manualPagination: true,
    totalCount: data?.total || 0,
    ensurePageInRange,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyTitle={t('No Inviter Rebate Records Found')}
      emptyDescription={t(
        'No inviter rebate records in the selected period. Switch the period or metric to see more.'
      )}
      skeletonKeyPrefix='inviter-rebate-rankings-skeleton'
      applyHeaderSize
      toolbarProps={null}
    />
  )
}

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

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { createServerError } from '@/lib/server-error-message'

import { getInviterRebateLedgerSummary } from '../api'

const route = getRouteApi('/_authenticated/inviter-rebate/ledger')

// Summary cards for the current ledger filters. The aggregation follows the
// filters in the URL, so it re-fetches whenever a filter changes.
export function LedgerSummary() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const search = route.useSearch()

  const filters = {
    inviter_id: search.inviterId,
    invitee_id: search.inviteeId,
    status: search.status,
    source_type: search.sourceType,
  }

  const query = useQuery({
    queryKey: ['inviter-rebate-ledger-summary', ...Object.values(filters)],
    queryFn: async () => {
      const result = await getInviterRebateLedgerSummary(filters)
      if (!result.success) {
        throw createServerError(result, t('Failed to load rebate summary'))
      }
      return result.data
    },
    placeholderData: (previousData) => previousData,
  })

  if (query.isPending) {
    return (
      <div
        role='status'
        aria-label={t('Loading rebate summary')}
        className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
      >
        {['granted', 'released', 'locked', 'voided'].map((key) => (
          <div key={key} className='rounded-lg border p-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='mt-2 h-7 w-32' />
          </div>
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title={t('Failed to load rebate summary')}
        description={t(
          'Rebate data is unavailable. Your ledger actions are still available.'
        )}
        onRetry={() => void query.refetch()}
        className='min-h-0 py-6'
      />
    )
  }

  const summary = query.data
  const stats = [
    {
      key: 'granted',
      label: t('Rebate Total'),
      quota: summary?.granted_quota ?? 0,
    },
    {
      key: 'released',
      label: t('Released rebates'),
      quota: summary?.released_quota ?? 0,
    },
    {
      key: 'locked',
      label: t('Locked rebates'),
      quota: summary?.locked_quota ?? 0,
    },
    { key: 'voided', label: t('Voided'), quota: summary?.voided_quota ?? 0 },
  ]
  const suspectCount = summary?.suspect_count ?? 0
  const suspectLockedQuota = summary?.suspect_locked_quota ?? 0

  return (
    <div className='flex flex-col gap-3' aria-busy={query.isFetching}>
      <dl className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat) => (
          <div
            key={stat.key}
            className='bg-background min-w-0 rounded-lg border p-3 sm:p-4'
          >
            <dt className='text-muted-foreground text-xs font-medium'>
              {stat.label}
            </dt>
            <dd className='mt-1 text-xl font-semibold break-all sm:text-2xl'>
              {formatQuotaWithCurrency(stat.quota, { locale })}
            </dd>
          </div>
        ))}
      </dl>
      {suspectCount > 0 ? (
        <div className='border-warning/40 bg-warning/10 text-warning rounded-lg border p-3 text-sm'>
          {t(
            '{{count}} rebates are locked for suspected self-invites, covering {{quota}}.',
            {
              count: suspectCount,
              quota: formatQuotaWithCurrency(suspectLockedQuota, { locale }),
            }
          )}
        </div>
      ) : null}
    </div>
  )
}

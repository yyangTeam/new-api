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
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import { useInviterRebateSummary } from '../hooks/use-inviter-rebate'

export function InviterRebateSummary(props: { userId: number }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const query = useInviterRebateSummary(props.userId)

  if (query.isPending) {
    return (
      <div
        role='status'
        aria-label={t('Loading rebate summary')}
        className='space-y-4'
      >
        <div className='grid gap-3 sm:grid-cols-3'>
          {['locked', 'released', 'total'].map((key) => (
            <div key={key} className='rounded-lg border p-3'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='mt-2 h-7 w-32' />
            </div>
          ))}
        </div>
        <Skeleton className='h-16 w-full' />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title={t('Failed to load rebate summary')}
        description={t(
          'Rebate data is unavailable. Your wallet actions are still available.'
        )}
        onRetry={() => void query.refetch()}
        className='min-h-0 py-6'
      />
    )
  }

  const summary = query.data
  const tier = summary.tier
  const hasNextTier = tier.next_min_invitees > 0
  const remaining = Math.max(0, tier.next_min_invitees - tier.aff_count)
  const stats = [
    { key: 'locked', label: t('Locked rebates'), quota: summary.locked_quota },
    {
      key: 'released',
      label: t('Released rebates'),
      quota: summary.released_quota,
    },
    { key: 'total', label: t('Rebate Total'), quota: summary.granted_quota },
  ]

  return (
    <div className='space-y-4' aria-busy={query.isFetching}>
      <dl className='grid gap-3 sm:grid-cols-3'>
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
      <p className='text-muted-foreground text-xs'>
        {t(
          'Ledger totals include released and locked rebates, exclude voided rebates, and do not include legacy or registration rewards. Released totals are not your transferable balance.'
        )}
      </p>
      <div className='flex flex-wrap gap-x-6 gap-y-2 text-sm'>
        <span>
          {t('Rebated Invitees')}: {formatNumber(summary.invitee_count, locale)}
        </span>
        <span>
          {t('Rebate Records')}: {formatNumber(summary.rebate_count, locale)}
        </span>
        <span>
          {t('Voided')}:{' '}
          {formatQuotaWithCurrency(summary.voided_quota, { locale })}
        </span>
      </div>
      <div className='bg-background rounded-lg border p-3 sm:p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
          <span className='font-medium'>{t('Current base rebate rate')}</span>
          <span>{formatNumber(tier.current_percent, locale)}%</span>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>
          {t('Bound Invitees')}: {formatNumber(tier.aff_count, locale)}
        </p>
        {hasNextTier ? (
          <Progress
            value={Math.min(tier.aff_count, tier.next_min_invitees)}
            max={tier.next_min_invitees}
            className='mt-3'
            aria-valuetext={t('{{current}} of {{target}} bound invitees', {
              current: formatNumber(tier.aff_count, locale),
              target: formatNumber(tier.next_min_invitees, locale),
            })}
          >
            <ProgressLabel className='text-xs'>
              {t(
                'Invite {{remaining}} more people to reach the {{percent}}% tier',
                {
                  remaining: formatNumber(remaining, locale),
                  percent: formatNumber(tier.next_percent, locale),
                }
              )}
            </ProgressLabel>
          </Progress>
        ) : (
          <p className='text-muted-foreground mt-3 text-xs'>
            {t(
              'No next rebate tier is available under the current configuration.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}

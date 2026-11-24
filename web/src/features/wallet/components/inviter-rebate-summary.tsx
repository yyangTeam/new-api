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
import { Ban, CircleCheck, Info, Lock, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { IconBadge } from '@/components/ui/icon-badge'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { useInviterRebateSummary } from '../hooks/use-inviter-rebate'
import type { InviterRebateSummary, InviterRebateTier } from '../types'

// Keep the example in display units so currency and token modes stay consistent.
const EXAMPLE_TOPUP_UNITS = 10

function buildLadder(summary: InviterRebateSummary): InviterRebateTier[] {
  if (summary.tiers.length > 0) {
    return summary.tiers
  }
  return [{ min_invitees: 0, percent: summary.tier.current_percent }]
}

export function InviterRebateSummary(props: { userId: number }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const currency = useSystemConfigStore((state) => state.config.currency)
  const query = useInviterRebateSummary(props.userId)

  if (query.isPending) {
    return (
      <div
        role='status'
        aria-label={t('Loading rebate summary')}
        className='flex flex-col gap-4'
      >
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {['total', 'released', 'locked', 'voided'].map((key) => (
            <div key={key} className='min-w-0'>
              <Skeleton className='h-4 w-24 max-w-full' />
              <Skeleton className='mt-2 h-7 w-28 max-w-full' />
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
  const quotaPerUnit =
    currency.quotaPerUnit && currency.quotaPerUnit > 0
      ? currency.quotaPerUnit
      : DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  const exampleTopUpQuota = EXAMPLE_TOPUP_UNITS * quotaPerUnit
  const exampleRebateQuota = Math.floor(
    (exampleTopUpQuota * tier.current_percent) / 100
  )
  // First top-up uses the higher rate, not the sum of both rates.
  const firstTopUpBonus = Math.max(
    0,
    summary.first_topup_percent - tier.current_percent
  )
  const stats = [
    {
      key: 'total',
      label: t('Rebate Total'),
      quota: summary.granted_quota,
      icon: Sparkles,
      tone: 'neutral',
    },
    {
      key: 'released',
      label: t('Released rebates'),
      quota: summary.released_quota,
      icon: CircleCheck,
      tone: 'success',
    },
    {
      key: 'locked',
      label: t('Locked rebates'),
      quota: summary.locked_quota,
      icon: Lock,
      tone: 'warning',
    },
    {
      key: 'voided',
      label: t('Voided'),
      quota: summary.voided_quota,
      icon: Ban,
      tone: 'neutral',
    },
  ] as const
  const ladder = buildLadder(summary)
  const hasConfiguredRate =
    tier.current_percent > 0 ||
    tier.next_percent > 0 ||
    summary.first_topup_percent > 0 ||
    summary.tiers.some((step) => step.percent > 0)
  const hasRecordedRewards =
    summary.rebate_count > 0 || stats.some((stat) => stat.quota !== 0)

  return (
    <div className='flex min-w-0 flex-col gap-5' aria-busy={query.isFetching}>
      <div className='flex min-w-0 flex-col gap-3'>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4'>
          {stats.map((stat) => {
            const TileIcon = stat.icon
            return (
              <div key={stat.key} className='min-w-0'>
                <dt className='text-muted-foreground flex items-start gap-1.5 text-xs font-medium'>
                  <IconBadge tone={stat.tone} size='xs'>
                    <TileIcon aria-hidden='true' />
                  </IconBadge>
                  <span className='min-w-0 break-words'>{stat.label}</span>
                </dt>
                <dd className='text-foreground mt-2 text-xl font-semibold break-all sm:text-2xl'>
                  {formatQuotaWithCurrency(stat.quota, { locale })}
                </dd>
              </div>
            )
          })}
        </dl>
        <p className='text-muted-foreground text-xs leading-relaxed'>
          {t(
            'Ledger totals include released and locked rebates, exclude voided rebates, and do not include legacy or registration rewards. Released totals are not your transferable balance.'
          )}
        </p>
        <div className='text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs'>
          <span>
            {t('Rebated Invitees')}:{' '}
            {formatNumber(summary.invitee_count, locale)}
          </span>
          <span>
            {t('Rebate Records')}: {formatNumber(summary.rebate_count, locale)}
          </span>
        </div>
      </div>

      {!hasConfiguredRate && (
        <Alert role='status'>
          <Info aria-hidden='true' />
          <AlertDescription>
            {t('No recharge rebate rate is currently configured.')}
          </AlertDescription>
        </Alert>
      )}
      {hasConfiguredRate && !hasRecordedRewards && (
        <EmptyState
          icon={Sparkles}
          title={t('No recharge rebates yet')}
          description={t(
            'Share your referral link. Recorded recharge rebates will appear here.'
          )}
          className='min-h-0 py-4'
        />
      )}

      <div className='flex min-w-0 flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
          <span className='font-medium'>{t('Rebate tiers')}</span>
          <span className='text-muted-foreground text-xs'>
            {t('Bound Invitees')}: {formatNumber(tier.aff_count, locale)}
          </span>
        </div>
        {tier.current_percent > 0 && (
          <div className='flex flex-col gap-1 text-sm'>
            <p className='text-muted-foreground flex flex-wrap gap-x-1'>
              <span>
                {t('For every {{topup}} your friends recharge', {
                  topup: formatQuotaWithCurrency(exampleTopUpQuota, { locale }),
                })}
              </span>
              <span className='text-foreground font-medium'>
                {t('you earn {{rebate}}', {
                  rebate: formatQuotaWithCurrency(exampleRebateQuota, {
                    locale,
                  }),
                })}
              </span>
            </p>
            <p className='text-muted-foreground text-xs'>
              {t('at your current {{percent}}% rebate rate', {
                percent: formatNumber(tier.current_percent, locale),
              })}
            </p>
          </div>
        )}
        {firstTopUpBonus > 0 && (
          <p className='flex items-start gap-1.5 text-sm'>
            <Zap
              className='text-muted-foreground mt-0.5 size-4 shrink-0'
              aria-hidden='true'
            />
            {t('Friends first top-ups earn {{percent}}% rebates', {
              percent: formatNumber(summary.first_topup_percent, locale),
            })}
          </p>
        )}
        <ol className='flex flex-wrap gap-2'>
          {ladder.map((step) => {
            const isCurrent = step.percent === tier.current_percent
            // Zero is the no-next-tier sentinel, not the first tier's threshold.
            const isNext =
              hasNextTier && step.min_invitees === tier.next_min_invitees
            return (
              <li
                key={`${step.min_invitees}-${step.percent}`}
                className={cn(
                  'flex min-w-[6.5rem] flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center sm:flex-none sm:px-4',
                  isCurrent && 'border-primary/40 bg-primary/5'
                )}
              >
                <span className='text-foreground text-lg font-semibold'>
                  {formatNumber(step.percent, locale)}%
                </span>
                <span className='text-muted-foreground text-xs'>
                  {t('{{count}}+ friends', {
                    count: formatNumber(step.min_invitees, locale),
                  })}
                </span>
                {isCurrent && (
                  <Badge variant='secondary'>{t('Current tier')}</Badge>
                )}
                {isNext && <Badge variant='outline'>{t('Next tier')}</Badge>}
              </li>
            )
          })}
        </ol>
        {hasNextTier ? (
          <Progress
            value={Math.min(tier.aff_count, tier.next_min_invitees)}
            max={tier.next_min_invitees}
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
          <p className='text-muted-foreground text-xs'>
            {t(
              'No next rebate tier is available under the current configuration.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}

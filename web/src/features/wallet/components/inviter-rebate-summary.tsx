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
import { Ban, CircleCheck, Lock, Sparkles, Zap, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
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

// A concrete "friends recharge → you earn" illustration is shown at a
// 10-display-unit top-up so both amounts stay truthful in every quota
// display mode (currency and raw tokens both scale linearly).
const EXAMPLE_TOPUP_UNITS = 10

function buildLadder(summary: InviterRebateSummary): InviterRebateTier[] {
  if (summary.tiers.length > 0) {
    return summary.tiers
  }
  // Flat rate: a single implicit tier at the current base percent.
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
  const quotaPerUnit =
    currency.quotaPerUnit && currency.quotaPerUnit > 0
      ? currency.quotaPerUnit
      : DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  const exampleTopUpQuota = EXAMPLE_TOPUP_UNITS * quotaPerUnit
  const exampleRebateQuota = Math.floor(
    (exampleTopUpQuota * tier.current_percent) / 100
  )
  // The first top-up bonus only reads as a benefit when it beats the
  // inviter's current effective rate (credit logic applies the max).
  const firstTopUpBonus = Math.max(
    0,
    summary.first_topup_percent - tier.current_percent
  )
  const stats = [
    {
      key: 'released',
      label: t('Released rebates'),
      quota: summary.released_quota,
    },
    { key: 'locked', label: t('Locked rebates'), quota: summary.locked_quota },
    { key: 'voided', label: t('Voided'), quota: summary.voided_quota },
  ] as const
  const ladder = buildLadder(summary)

  return (
    <div className='space-y-4' aria-busy={query.isFetching}>
      {/* 收益 hero：返利总额 + 「好友每充多少你得多少」的具体示例 */}
      <div className='from-primary/15 via-primary/10 rounded-xl border bg-gradient-to-br to-transparent p-4 sm:p-5'>
        <div className='flex flex-wrap items-end justify-between gap-x-8 gap-y-4'>
          <div className='min-w-0'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase'>
              <Sparkles className='size-3.5' aria-hidden='true' />
              {t('Rebate Total')}
            </p>
            <p className='text-foreground mt-1.5 font-mono text-3xl font-bold tracking-tight break-all tabular-nums sm:text-4xl'>
              {formatQuotaWithCurrency(summary.granted_quota, { locale })}
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t('Friends recharge, you earn')}
            </p>
          </div>
          {tier.current_percent > 0 && (
            <div className='border-success/30 bg-success/5 min-w-0 rounded-lg border px-3.5 py-2.5'>
              <p className='text-muted-foreground text-[11px]'>
                {t('For every {{topup}} your friends recharge', {
                  topup: formatQuotaWithCurrency(exampleTopUpQuota, {
                    locale,
                  }),
                })}
              </p>
              <p className='text-success mt-0.5 font-mono text-xl font-bold tabular-nums sm:text-2xl'>
                {t('you earn {{rebate}}', {
                  rebate: formatQuotaWithCurrency(exampleRebateQuota, {
                    locale,
                  }),
                })}
              </p>
              <p className='text-muted-foreground mt-0.5 text-[11px]'>
                {t('at your current {{percent}}% rebate rate', {
                  percent: formatNumber(tier.current_percent, locale),
                })}
              </p>
            </div>
          )}
        </div>
        {firstTopUpBonus > 0 && (
          <p className='text-success mt-3 flex items-center gap-1.5 text-xs font-medium'>
            <Zap className='size-3.5' aria-hidden='true' />
            {t('Friends first top-ups earn {{percent}}% rebates', {
              percent: formatNumber(summary.first_topup_percent, locale),
            })}
          </p>
        )}
      </div>

      {/* 状态分桶：已到手的（成功）、在途的（警告）、作废的（中性） */}
      <dl className='grid grid-cols-3 gap-2.5 sm:gap-3'>
        {stats.map((stat) => {
          const TileIcon = rebateTileIcon(stat.key)
          return (
            <div
              key={stat.key}
              className='bg-background min-w-0 rounded-lg border p-3 sm:p-4'
            >
              <dt className='text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase sm:text-xs'>
                <IconBadge tone={rebatetileTone(stat.key)} size='xs'>
                  <TileIcon aria-hidden='true' />
                </IconBadge>
                <span className='truncate'>{stat.label}</span>
              </dt>
              <dd className='text-foreground mt-1.5 font-mono text-lg font-semibold break-all tabular-nums sm:text-xl'>
                {formatQuotaWithCurrency(stat.quota, { locale })}
              </dd>
            </div>
          )
        })}
      </dl>
      <p className='text-muted-foreground text-xs'>
        {t(
          'Ledger totals include released and locked rebates, exclude voided rebates, and do not include legacy or registration rewards. Released totals are not your transferable balance.'
        )}
      </p>
      <div className='text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm'>
        <span>
          {t('Rebated Invitees')}: {formatNumber(summary.invitee_count, locale)}
        </span>
        <span>
          {t('Rebate Records')}: {formatNumber(summary.rebate_count, locale)}
        </span>
      </div>

      {/* 阶梯可视化：当前档高亮，向下一档的进度条 */}
      <div className='bg-background rounded-lg border p-3 sm:p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
          <span className='font-medium'>{t('Rebate tiers')}</span>
          <span className='text-muted-foreground text-xs'>
            {t('Bound Invitees')}: {formatNumber(tier.aff_count, locale)}
          </span>
        </div>
        <ol className='mt-3 flex flex-wrap gap-2'>
          {ladder.map((step, index) => {
            const isCurrent = step.percent === tier.current_percent
            // next_min_invitees = 0 means no next tier (top tier or no
            // ladder); it must not match the first tier whose own
            // min_invitees is also 0.
            const isNext =
              hasNextTier && step.min_invitees === tier.next_min_invitees
            return (
              <li
                key={`${step.min_invitees}-${step.percent}`}
                className={cn(
                  'flex min-w-[6.5rem] flex-1 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-center sm:flex-none sm:px-4',
                  isCurrent && 'border-success/60 bg-success/15',
                  isNext && 'border-warning/40 bg-warning/5',
                  index === 0 && ladder.length === 1 && 'border-primary/30'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-base font-bold tabular-nums',
                    isCurrent ? 'text-success' : 'text-foreground'
                  )}
                >
                  {formatNumber(step.percent, locale)}%
                </span>
                <span className='text-muted-foreground text-[11px]'>
                  {t('{{count}}+ friends', {
                    count: formatNumber(step.min_invitees, locale),
                  })}
                </span>
                {isCurrent && (
                  <span className='text-success text-[10px] font-semibold tracking-wide uppercase'>
                    {t('Current tier')}
                  </span>
                )}
                {isNext && (
                  <span className='text-warning text-[10px] font-semibold tracking-wide uppercase'>
                    {t('Next tier')}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
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

// rebatetileTone maps a summary bucket to its status tone: money already
// in the inviter's pocket reads as success, pending money as warning,
// voided money as neutral.
function rebatetileTone(key: string): IconBadgeTone {
  if (key === 'released') return 'success'
  if (key === 'locked') return 'warning'
  return 'neutral'
}

// rebateTileIcon pairs each bucket with the lucide icon that matches its
// meaning: settled (check), pending (lock), cancelled (ban).
function rebateTileIcon(key: string): LucideIcon {
  if (key === 'released') return CircleCheck
  if (key === 'locked') return Lock
  return Ban
}

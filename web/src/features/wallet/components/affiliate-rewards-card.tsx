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
import { Share2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import type { UserWalletData } from '../types'
import { InviterRebateInvitees } from './inviter-rebate-invitees'
import { InviterRebateSummary } from './inviter-rebate-summary'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  userId?: number
  affiliateLink: string
  onTransfer: () => void
  complianceConfirmed?: boolean
  loading?: boolean
  userLoading?: boolean
}

export function AffiliateRewardsCard(props: AffiliateRewardsCardProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const hasRewards = (props.user?.aff_quota ?? 0) > 0
  const accountStats = [
    {
      key: 'available',
      label: t('Transferable rewards'),
      value: formatQuotaWithCurrency(props.user?.aff_quota ?? 0, { locale }),
    },
    {
      key: 'history',
      label: t('Total Earned'),
      value: formatQuotaWithCurrency(props.user?.aff_history_quota ?? 0, {
        locale,
      }),
    },
    {
      key: 'invitees',
      label: t('Invites'),
      value: formatNumber(props.user?.aff_count ?? 0, locale),
    },
  ]

  return (
    <Card data-card-hover='false' className='bg-muted/20 min-w-0 gap-0 py-0'>
      <CardContent className='grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(200px,1fr)_minmax(180px,0.65fr)_minmax(280px,1fr)] lg:items-center'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <IconBadge tone='chart-3'>
            <Share2 aria-hidden='true' />
          </IconBadge>
          <div className='min-w-0'>
            <h3 className='text-sm font-semibold'>{t('Referral Program')}</h3>
            <p className='text-muted-foreground text-xs'>
              {t(
                'Earn rewards when users join through your referral link. Transfer accumulated rewards to your balance anytime.'
              )}
            </p>
          </div>
        </div>

        <dl
          className='grid grid-cols-3 gap-2 text-center'
          aria-busy={props.userLoading}
        >
          {accountStats.map((stat) => (
            <div key={stat.key} className='min-w-0'>
              <dt className='text-muted-foreground text-[10px] font-medium'>
                {stat.label}
              </dt>
              <dd className='mt-0.5 text-sm font-semibold break-all'>
                {props.userLoading ? (
                  <Skeleton className='mx-auto h-5 w-16' />
                ) : (
                  stat.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className='flex min-w-0 items-center gap-2'>
          {props.loading ? (
            <Skeleton className='h-9 min-w-0 flex-1' />
          ) : (
            <>
              <Input
                value={props.affiliateLink}
                readOnly
                aria-label={t('Referral link')}
                className='border-muted bg-background/70 h-9 min-w-0 flex-1 font-mono text-xs'
              />
              <CopyButton
                value={props.affiliateLink}
                disabled={!props.affiliateLink}
                variant='outline'
                className='bg-background size-9 shrink-0'
                iconClassName='size-4'
                tooltip={t('Copy referral link')}
                aria-label={t('Copy referral link')}
              />
            </>
          )}
          {hasRewards && (
            <Button
              onClick={props.onTransfer}
              disabled={
                props.complianceConfirmed === false || props.userLoading
              }
              className='h-9 shrink-0 px-3'
              size='sm'
            >
              {t('Transfer to Balance')}
            </Button>
          )}
        </div>
        {props.complianceConfirmed === false && (
          <p className='text-muted-foreground text-xs lg:col-span-3'>
            {t(
              'Referral reward transfer is disabled until the administrator confirms compliance terms.'
            )}
          </p>
        )}
      </CardContent>
      {props.userId && props.userId > 0 ? (
        <CardContent
          key={props.userId}
          className='min-w-0 space-y-4 p-3 pt-0 sm:p-4 sm:pt-0'
        >
          <Separator />
          {/* 返利区域整块做主色渐变面板，让它在钱包页里第一眼可辨 */}
          <section
            aria-label={t('Recharge rebate overview')}
            className='from-primary/5 space-y-3 rounded-xl border bg-gradient-to-b to-transparent p-3 sm:p-4'
          >
            <div className='flex min-w-0 items-center gap-2.5'>
              <IconBadge tone='primary' size='title'>
                <Sparkles aria-hidden='true' />
              </IconBadge>
              <h4 className='text-base font-bold tracking-tight sm:text-lg'>
                {t('Recharge rebate overview')}
              </h4>
            </div>
            <InviterRebateSummary userId={props.userId} />
          </section>
          <Separator />
          <InviterRebateInvitees userId={props.userId} />
        </CardContent>
      ) : null}
    </Card>
  )
}

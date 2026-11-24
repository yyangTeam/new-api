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
    <Card
      data-card-hover='false'
      className='from-overview-accent-1/10 via-overview-accent-3/5 to-overview-accent-2/10 min-w-0 gap-0 bg-linear-to-br py-0'
    >
      <CardContent className='flex min-w-0 flex-col gap-5 p-4 sm:gap-6 sm:p-6'>
        <div className='flex min-w-0 items-start gap-3'>
          <IconBadge tone='primary'>
            <Share2 aria-hidden='true' />
          </IconBadge>
          <div className='min-w-0'>
            <h3 className='text-base font-semibold sm:text-lg'>
              {t('Referral Program')}
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('Share your referral link and track your invitation rewards.')}
            </p>
          </div>
        </div>

        <div className='grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8'>
          <div className='flex min-w-0 flex-col gap-4'>
            <div className='flex min-w-0 flex-wrap items-end gap-3 sm:gap-4'>
              <dl className='min-w-0 flex-1' aria-busy={props.userLoading}>
                <dt className='text-muted-foreground text-sm font-medium'>
                  {t('Transferable rewards')}
                </dt>
                <dd className='text-foreground mt-2 text-4xl font-semibold tracking-tight break-all sm:text-5xl'>
                  {props.userLoading ? (
                    <Skeleton className='h-12 w-36' />
                  ) : (
                    formatQuotaWithCurrency(props.user?.aff_quota ?? 0, {
                      locale,
                    })
                  )}
                </dd>
              </dl>
              {hasRewards && (
                <Button
                  onClick={props.onTransfer}
                  disabled={
                    props.complianceConfirmed === false || props.userLoading
                  }
                  variant='outline'
                  className='min-h-11'
                >
                  {t('Transfer to Balance')}
                </Button>
              )}
            </div>
            {props.complianceConfirmed === false && (
              <p className='text-muted-foreground text-sm'>
                {t(
                  'Referral reward transfer is disabled until the administrator confirms compliance terms.'
                )}
              </p>
            )}
            <dl
              className='grid grid-cols-2 gap-4'
              aria-busy={props.userLoading}
            >
              {accountStats.map((stat) => (
                <div key={stat.key} className='min-w-0'>
                  <dt className='text-muted-foreground text-xs font-medium'>
                    {stat.label}
                  </dt>
                  <dd className='mt-1 text-lg font-medium break-all'>
                    {props.userLoading ? (
                      <Skeleton className='h-6 w-20' />
                    ) : (
                      stat.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className='flex min-w-0 flex-col gap-3'>
            <span className='text-muted-foreground text-sm font-medium'>
              {t('Referral link')}
            </span>
            {props.loading ? (
              <div role='status' aria-label={t('Loading referral link')}>
                <Skeleton className='h-11 w-full' />
                <Skeleton className='mt-3 h-11 w-full' />
              </div>
            ) : (
              <>
                <Input
                  value={props.affiliateLink}
                  readOnly
                  aria-label={t('Referral link')}
                  className='min-h-11 min-w-0 font-mono text-xs'
                />
                <CopyButton
                  value={props.affiliateLink}
                  disabled={!props.affiliateLink}
                  variant='secondary'
                  size='default'
                  className='min-h-11 w-full sm:w-fit'
                  iconClassName='size-4'
                  tooltip={t('Copy invitation link')}
                  aria-label={t('Copy invitation link')}
                >
                  {t('Copy invitation link')}
                </CopyButton>
                {!props.affiliateLink && (
                  <p className='text-muted-foreground text-xs'>
                    {t('Referral link is not available yet.')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
      {props.userId && props.userId > 0 ? (
        <CardContent
          key={props.userId}
          className='flex min-w-0 flex-col gap-5 p-4 pt-0 sm:gap-6 sm:p-6 sm:pt-0'
        >
          <Separator />
          <section
            aria-label={t('Recharge rebate overview')}
            className='flex min-w-0 flex-col gap-4'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <Sparkles
                className='text-muted-foreground size-4'
                aria-hidden='true'
              />
              <h4 className='text-base font-semibold'>
                {t('Recharge rebate overview')}
              </h4>
            </div>
            <InviterRebateSummary userId={props.userId} />
          </section>
          <Separator />
          <InviterRebateInvitees
            userId={props.userId}
            affiliateLink={props.loading ? '' : props.affiliateLink}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}

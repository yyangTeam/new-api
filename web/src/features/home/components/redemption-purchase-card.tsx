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

import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight, Ticket, Wallet, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function RedemptionPurchaseCard(props: { purchaseLink: string }) {
  const { t } = useTranslation()
  const steps = [
    { number: '01', label: t('Choose an amount') },
    { number: '02', label: t('Get your code') },
    { number: '03', label: t('Redeem in your wallet') },
  ]

  return (
    <section className='home-purchase' aria-labelledby='home-purchase-title'>
      <Card className='home-purchase-card'>
        <CardContent className='home-purchase-content'>
          <div className='home-voucher-art' aria-hidden='true'>
            <div className='home-voucher-orbit' />
            <div className='home-voucher'>
              <div className='home-voucher-stub'>
                <Zap size={24} strokeWidth={1.5} />
                <span>NEW API</span>
                <div className='home-voucher-barcode' />
              </div>
              <div className='home-voucher-face'>
                <Ticket size={36} strokeWidth={1.2} />
                <span>{t('Redemption Code')}</span>
                <strong>•••• •••• ••••</strong>
                <div className='home-voucher-circuit' />
              </div>
            </div>
          </div>
          <div className='home-purchase-copy'>
            <span className='home-kicker'>
              <Zap size={13} aria-hidden='true' />
              {t('Get credits')}
            </span>
            <h2 id='home-purchase-title'>{t('Fuel your next request.')}</h2>
            <p>
              {t(
                'Purchase a redemption code, then redeem it in your wallet to add credit to your account.'
              )}
            </p>
            <ol className='home-purchase-steps'>
              {steps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </div>
          <div className='home-purchase-actions'>
            <Button
              role='link'
              render={
                <a
                  href={props.purchaseLink}
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
              className='home-action home-buy-code'
            >
              {t('Buy a redemption code')}
              <ArrowUpRight aria-hidden='true' />
            </Button>
            <div className='home-purchase-redeem'>
              <span>{t('Have a Code?')}</span>
              <Button
                variant='link'
                role='link'
                render={<Link to='/wallet' />}
                className='home-redeem-code'
              >
                <Wallet size={14} aria-hidden='true' />
                {t('Redeem a code')}
                <ArrowRight aria-hidden='true' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

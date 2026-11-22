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

import { SectionPageLayout } from '@/components/layout'

import { LedgerFilters } from './components/ledger-filters'
import { LedgerSummary } from './components/ledger-summary'
import { LedgerTable } from './components/ledger-table'

export function InviterRebateLedger() {
  const { t } = useTranslation()
  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>
        {t('Inviter Rebate Ledger')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <LedgerFilters />
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        {/* fixedContent clips overflow, so the height chain must stay
            definite (h-full min-h-0) and only the table area flexes; the
            summary stays at natural height and the table scrolls inside. */}
        <div className='flex h-full min-h-0 flex-col gap-4'>
          <LedgerSummary />
          <div className='min-h-0 flex-1'>
            <LedgerTable />
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

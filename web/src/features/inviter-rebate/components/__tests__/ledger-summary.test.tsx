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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { toIntlLocale } from '@/i18n/languages'
import { api } from '@/lib/api'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { Route as LedgerRoute } from '@/routes/_authenticated/inviter-rebate/ledger'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { LedgerSummary } from '../ledger-summary'

const clients: QueryClient[] = []
const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: { en: { translation: {} } },
  initAsync: false,
})

const locale = toIntlLocale('en')
const summaryData = {
  rebate_count: 10,
  released_quota: 5_000_000,
  locked_quota: 2_500_000,
  voided_quota: 500_000,
  granted_quota: 7_500_000,
  suspect_count: 0,
  suspect_locked_quota: 0,
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
})

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  vi.restoreAllMocks()
})

function mockSummaryApi(data = summaryData) {
  return vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: { success: true, data },
  }))
}

async function renderLedgerSummary(initialEntry = '/inviter-rebate/ledger') {
  const root = createRootRoute()
  const auth = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const ledger = createRoute({
    getParentRoute: () => auth,
    path: 'inviter-rebate/ledger',
    validateSearch: LedgerRoute.options.validateSearch,
    component: () => <LedgerSummary />,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([ledger])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>
  )
  return { router }
}

it('renders the four summary cards with the aggregated quotas', async () => {
  mockSummaryApi()
  await renderLedgerSummary()

  expect(await screen.findByText('Rebate Total')).toBeInTheDocument()
  expect(screen.getByText('Released rebates')).toBeInTheDocument()
  expect(screen.getByText('Locked rebates')).toBeInTheDocument()
  expect(screen.getByText('Voided')).toBeInTheDocument()
  expect(
    screen.getByText(formatQuotaWithCurrency(7_500_000, { locale }))
  ).toBeInTheDocument()
  expect(
    screen.getByText(formatQuotaWithCurrency(5_000_000, { locale }))
  ).toBeInTheDocument()
  expect(
    screen.getByText(formatQuotaWithCurrency(2_500_000, { locale }))
  ).toBeInTheDocument()
  expect(
    screen.getByText(formatQuotaWithCurrency(500_000, { locale }))
  ).toBeInTheDocument()
})

it('hides the self-invite suspect warning when there are none', async () => {
  mockSummaryApi()
  await renderLedgerSummary()

  await screen.findByText('Rebate Total')
  expect(screen.queryByText(/suspected self-invites/)).not.toBeInTheDocument()
})

it('shows the self-invite suspect warning with count and quota', async () => {
  mockSummaryApi({
    ...summaryData,
    suspect_count: 3,
    suspect_locked_quota: 750_000,
  })
  await renderLedgerSummary()

  expect(
    await screen.findByText(
      `3 rebates are locked for suspected self-invites, covering ${formatQuotaWithCurrency(750_000, { locale })}.`
    )
  ).toBeInTheDocument()
})

it('follows the ledger filters from the page URL', async () => {
  const get = mockSummaryApi()
  await renderLedgerSummary(
    '/inviter-rebate/ledger?status=locked&sourceType=redemption&inviterId=101'
  )

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/ledger/summary', {
    params: { inviter_id: 101, status: 'locked', source_type: 'redemption' },
  })
})

it('shows the error state with a working retry when the summary fails', async () => {
  const get = vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: { success: false, message: 'summary unavailable' },
  }))
  const user = userEvent.setup()
  await renderLedgerSummary()

  expect(
    await screen.findByText('Failed to load rebate summary')
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      'Rebate data is unavailable. Your ledger actions are still available.'
    )
  ).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
})

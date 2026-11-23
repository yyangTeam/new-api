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
import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { Route as InviterRebateRoute } from '@/routes/_authenticated/inviter-rebate/'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { RankingsTable } from '../rankings-table'

const clients: QueryClient[] = []
const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: { en: { translation: {} } },
  initAsync: false,
})

const rankingItems = [
  {
    inviter_id: 101,
    username: 'alice',
    display_name: 'Alice',
    aff_count: 12,
    rebate_count: 30,
    invitee_count: 3,
    released_quota: 5_000_000,
    locked_quota: 2_500_000,
    voided_quota: 500_000,
    granted_quota: 7_500_000,
  },
  {
    inviter_id: 999,
    username: '',
    display_name: '',
    aff_count: 0,
    rebate_count: 1,
    invitee_count: 1,
    released_quota: 0,
    locked_quota: 250_000,
    voided_quota: 0,
    granted_quota: 250_000,
  },
]

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

function mockRankingsApi(items = rankingItems, total = rankingItems.length) {
  return vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: {
      success: true,
      data: { items, total, page: 1, page_size: 20 },
    },
  }))
}

async function renderRankingsTable(initialEntry = '/inviter-rebate/') {
  const root = createRootRoute()
  const auth = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const rankings = createRoute({
    getParentRoute: () => auth,
    path: 'inviter-rebate/',
    validateSearch: InviterRebateRoute.options.validateSearch,
    component: () => (
      <TooltipProvider>
        <RankingsTable />
      </TooltipProvider>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([rankings])]),
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

it('loads rankings with the default metric and period', async () => {
  const get = mockRankingsApi()
  await renderRankingsTable()

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/rankings', {
    params: { metric: 'rebate', period: 'month', p: 1, page_size: 20 },
  })
  expect(await screen.findByText('alice')).toBeInTheDocument()
  expect(screen.getByText('Alice')).toBeInTheDocument()
})

it('renders hard-deleted inviter rows with a fallback label', async () => {
  mockRankingsApi()
  await renderRankingsTable()

  await screen.findByText('alice')
  expect(screen.getByText('Deleted User')).toBeInTheDocument()
})

it('restores the metric and period from the page URL on load', async () => {
  const get = mockRankingsApi()
  await renderRankingsTable('/inviter-rebate/?metric=invitees&period=all')

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/rankings', {
    params: { metric: 'invitees', period: 'all', p: 1, page_size: 20 },
  })
})

it('shows the empty state when there are no ranking records', async () => {
  mockRankingsApi([], 0)
  await renderRankingsTable()

  expect(
    await screen.findByText('No Inviter Rebate Records Found')
  ).toBeInTheDocument()
})

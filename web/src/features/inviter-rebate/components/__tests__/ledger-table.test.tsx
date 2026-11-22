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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { toast } from 'sonner'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import zh from '@/i18n/locales/zh.json'
import { formatQuota } from '@/lib/format'
import { Route as LedgerRoute } from '@/routes/_authenticated/inviter-rebate/ledger'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { LedgerTable } from '../ledger-table'

const clients: QueryClient[] = []
const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: { en: { translation: {} } },
  initAsync: false,
})

const ledgerItems = [
  {
    id: 3,
    created_at: 1_760_000_000,
    inviter_id: 101,
    inviter_username: 'alice',
    invitee_id: 202,
    invitee_username: 'bob',
    source_type: 'topup',
    source_id: 9001,
    base_quota: 10_000_000,
    percent: 10,
    quota: 1_000_000,
    status: 'locked',
    locked_reason: 'self_invite_suspect',
    voided_reason: '',
    released_at: 0,
  },
  {
    id: 2,
    created_at: 1_760_000_100,
    inviter_id: 999,
    inviter_username: '',
    invitee_id: 203,
    invitee_username: 'carol',
    source_type: 'redemption',
    source_id: 9002,
    base_quota: 5_000_000,
    percent: 10,
    quota: 500_000,
    status: 'released',
    locked_reason: '',
    voided_reason: '',
    released_at: 1_760_000_200,
  },
  {
    id: 1,
    created_at: 1_760_000_200,
    inviter_id: 101,
    inviter_username: 'erin',
    invitee_id: 204,
    invitee_username: 'dave',
    source_type: 'topup',
    source_id: 9003,
    base_quota: 2_000_000,
    percent: 10,
    quota: 200_000,
    status: 'voided',
    locked_reason: '',
    voided_reason: 'admin_void',
    released_at: 0,
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
  toast.dismiss()
  localStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
  vi.restoreAllMocks()
})

function mockLedgerApi(items = ledgerItems, total = items.length) {
  return vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: {
      success: true,
      data: { items, total, page: 1, page_size: 20 },
    },
  }))
}

function mockLedgerActionApi(
  result: { quota: number; debt: number } = { quota: 1_000_000, debt: 0 }
) {
  return vi.spyOn(api, 'post').mockImplementation(async () => ({
    data: {
      success: true,
      data: { row: ledgerItems[0], inviter_id: 101, ...result },
    },
  }))
}

async function renderLedgerTable(
  initialEntry = '/inviter-rebate/ledger',
  instance: typeof i18n = i18n
) {
  const root = createRootRoute()
  const auth = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const ledger = createRoute({
    getParentRoute: () => auth,
    path: 'inviter-rebate/ledger',
    validateSearch: LedgerRoute.options.validateSearch,
    component: () => (
      <TooltipProvider>
        <LedgerTable />
      </TooltipProvider>
    ),
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
      <I18nextProvider i18n={instance}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>
  )
  return { router }
}

it('loads the ledger with the default pagination', async () => {
  const get = mockLedgerApi()
  await renderLedgerTable()

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/ledger', {
    params: { p: 1, page_size: 20 },
  })
  expect(await screen.findByText('alice')).toBeInTheDocument()
})

it('restores the ledger filters from the page URL on load', async () => {
  const get = mockLedgerApi()
  await renderLedgerTable('/inviter-rebate/ledger?status=locked&inviterId=101')

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/ledger', {
    params: { inviter_id: 101, status: 'locked', p: 1, page_size: 20 },
  })
})

it('restores the pagination from the page URL on load', async () => {
  const get = mockLedgerApi(ledgerItems, 100)
  await renderLedgerTable('/inviter-rebate/ledger?page=2&pageSize=50')

  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/ledger', {
    params: { p: 2, page_size: 50 },
  })
})

it('renders hard-deleted inviter rows with a fallback label', async () => {
  mockLedgerApi()
  await renderLedgerTable()

  await screen.findByText('alice')
  expect(screen.getByText('Deleted User')).toBeInTheDocument()
})

it('shows the empty state when there are no ledger records', async () => {
  mockLedgerApi([], 0)
  await renderLedgerTable()

  expect(
    await screen.findByText('No Inviter Rebate Records Found')
  ).toBeInTheDocument()
})

it('renders one action set per status and none for voided rows', async () => {
  mockLedgerApi()
  await renderLedgerTable()

  await screen.findByText('alice')
  // locked row -> Void + Release, released row -> Clawback, voided row -> —
  expect(screen.getAllByRole('button', { name: 'Void' })).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Release' })).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Clawback' })).toHaveLength(1)
  expect(screen.getByText('—')).toBeInTheDocument()
})

it('renders reason labels translated when the zh locale provides them', async () => {
  mockLedgerApi()
  const language = createInstance()
  await language.init({ lng: 'zh', resources: { zh }, initAsync: false })
  await renderLedgerTable('/inviter-rebate/ledger', language)

  // Regression: reason labels are dynamic t() keys resolved from the locale
  // files; before the keys were added they fell back to English strings.
  expect(await screen.findByText('疑似自邀')).toBeInTheDocument()
  expect(screen.getByText('管理员作废')).toBeInTheDocument()
})

it('voids a locked rebate after confirmation and refreshes the ledger', async () => {
  const get = mockLedgerApi()
  const post = mockLedgerActionApi({ quota: 1_000_000, debt: 0 })
  const success = vi.spyOn(toast, 'success')
  const user = userEvent.setup()
  await renderLedgerTable()

  await screen.findByText('alice')
  await user.click(screen.getByRole('button', { name: 'Void' }))

  const dialog = screen.getByRole('alertdialog', { name: 'Void this rebate?' })
  expect(dialog).toHaveTextContent(formatQuota(1_000_000))
  await user.click(within(dialog).getByRole('button', { name: 'Void' }))

  expect(post).toHaveBeenCalledWith('/api/inviter_rebate/ledger/3/void')
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      `Invitation rebate ${formatQuota(1_000_000)} voided by manual review`
    )
  )
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
  // Both the ledger rows and the summary aggregation are invalidated.
  await waitFor(() =>
    expect(
      get.mock.calls.filter((call) => call[0] === '/api/inviter_rebate/ledger')
    ).toHaveLength(2)
  )
})

it('releases a locked rebate after confirmation', async () => {
  mockLedgerApi()
  const post = mockLedgerActionApi({ quota: 1_000_000, debt: 0 })
  const success = vi.spyOn(toast, 'success')
  const user = userEvent.setup()
  await renderLedgerTable()

  await screen.findByText('alice')
  await user.click(screen.getByRole('button', { name: 'Release' }))

  const dialog = screen.getByRole('alertdialog', {
    name: 'Release this rebate?',
  })
  await user.click(within(dialog).getByRole('button', { name: 'Release' }))

  expect(post).toHaveBeenCalledWith('/api/inviter_rebate/ledger/3/release')
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      `Invitation rebate ${formatQuota(1_000_000)} released after manual review`
    )
  )
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
})

it('claws back a released rebate and reports outstanding debt', async () => {
  mockLedgerApi()
  const post = mockLedgerActionApi({ quota: 300_000, debt: 200_000 })
  const success = vi.spyOn(toast, 'success')
  const user = userEvent.setup()
  await renderLedgerTable()

  await screen.findByText('alice')
  await user.click(screen.getByRole('button', { name: 'Clawback' }))

  const dialog = screen.getByRole('alertdialog', {
    name: 'Claw back this rebate?',
  })
  // The inviter of the released row was hard-deleted.
  expect(dialog).toHaveTextContent('Deleted User')
  await user.click(within(dialog).getByRole('button', { name: 'Clawback' }))

  expect(post).toHaveBeenCalledWith('/api/inviter_rebate/ledger/2/clawback')
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      `Invitation rebate ${formatQuota(300_000)} debt outstanding after refund clawback, manual review required`
    )
  )
})

it('keeps the dialog open and surfaces the error when an action fails', async () => {
  mockLedgerApi()
  const post = vi.spyOn(api, 'post').mockImplementation(async () => ({
    data: { success: false, message: 'Rebate row is not locked' },
  }))
  const error = vi.spyOn(toast, 'error')
  const user = userEvent.setup()
  await renderLedgerTable()

  await screen.findByText('alice')
  await user.click(screen.getByRole('button', { name: 'Void' }))

  const dialog = screen.getByRole('alertdialog', { name: 'Void this rebate?' })
  await user.click(within(dialog).getByRole('button', { name: 'Void' }))

  expect(post).toHaveBeenCalledWith('/api/inviter_rebate/ledger/3/void')
  await waitFor(() =>
    expect(error).toHaveBeenCalledWith('Rebate row is not locked')
  )
  expect(screen.getByRole('alertdialog')).toBeInTheDocument()
})

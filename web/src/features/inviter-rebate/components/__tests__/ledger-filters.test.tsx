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

For commercial licensing, please contact support@quantumnous.com.
*/
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

import { Route as LedgerRoute } from '@/routes/_authenticated/inviter-rebate/ledger'

import { LedgerFilters } from '../ledger-filters'

const i18n = createInstance()
await i18n.init({
  lng: 'en',
  resources: { en: { translation: {} } },
  initAsync: false,
})

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

async function renderLedgerFilters(initialEntry = '/inviter-rebate/ledger') {
  const root = createRootRoute()
  const auth = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const ledger = createRoute({
    getParentRoute: () => auth,
    path: 'inviter-rebate/ledger',
    validateSearch: LedgerRoute.options.validateSearch,
    component: () => <LedgerFilters />,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([ledger])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
  await router.load()
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  )
  return { router }
}

it('commits a valid inviter id on Enter and resets the page', async () => {
  const { router } = await renderLedgerFilters('/inviter-rebate/ledger?page=3')
  const user = userEvent.setup()

  await user.type(
    screen.getByRole('spinbutton', { name: 'Inviter ID' }),
    '101{Enter}'
  )
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ inviterId: 101 })
  )
  expect(router.state.location.search.page).toBeUndefined()
})

it('drops an invalid inviter id instead of navigating', async () => {
  const { router } = await renderLedgerFilters()
  const user = userEvent.setup()

  await user.type(
    screen.getByRole('spinbutton', { name: 'Inviter ID' }),
    '0{Enter}'
  )
  expect(router.state.location.search.inviterId).toBeUndefined()
})

it('clears an existing invitee id filter when the input is emptied', async () => {
  const { router } = await renderLedgerFilters(
    '/inviter-rebate/ledger?inviteeId=202'
  )
  const user = userEvent.setup()
  const input = screen.getByRole('spinbutton', { name: 'Invitee ID' })

  expect(input).toHaveValue(202)
  await user.clear(input)
  await user.type(input, '{Enter}')
  await waitFor(() =>
    expect(router.state.location.search.inviteeId).toBeUndefined()
  )
})

it('applies the status filter from the status select', async () => {
  const { router } = await renderLedgerFilters()
  const user = userEvent.setup()

  await user.click(screen.getByRole('combobox', { name: 'Status' }))
  await user.click(await screen.findByRole('option', { name: 'Locked' }))
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ status: 'locked' })
  )
  expect(router.state.location.search.page).toBeUndefined()
})

it('clears the status filter when the all-statuses option is picked', async () => {
  const { router } = await renderLedgerFilters(
    '/inviter-rebate/ledger?status=locked'
  )
  const user = userEvent.setup()

  await user.click(screen.getByRole('combobox', { name: 'Status' }))
  await user.click(await screen.findByRole('option', { name: 'All Statuses' }))
  await waitFor(() =>
    expect(router.state.location.search.status).toBeUndefined()
  )
})

it('applies the source type filter from the source select', async () => {
  const { router } = await renderLedgerFilters()
  const user = userEvent.setup()

  await user.click(screen.getByRole('combobox', { name: 'Source Type' }))
  await user.click(await screen.findByRole('option', { name: 'Redemption' }))
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({
      sourceType: 'redemption',
    })
  )
})

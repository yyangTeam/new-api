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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Route as InviterRebateRoute } from '@/routes/_authenticated/inviter-rebate/'

import { RankingsViewControls } from '../rankings-view-controls'

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

async function renderViewControls(initialEntry = '/inviter-rebate/') {
  const root = createRootRoute()
  const auth = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
  })
  const rankings = createRoute({
    getParentRoute: () => auth,
    path: 'inviter-rebate/',
    validateSearch: InviterRebateRoute.options.validateSearch,
    component: () => <RankingsViewControls />,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([rankings])]),
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

it('switching the metric updates the URL search and resets the page', async () => {
  const user = userEvent.setup()
  const { router } = await renderViewControls(
    '/inviter-rebate/?page=3&pageSize=20'
  )

  await user.click(screen.getByRole('combobox', { name: 'Ranking Metric' }))
  await user.click(screen.getByRole('option', { name: 'Invitee Count' }))

  expect(router.state.location.search).toMatchObject({
    metric: 'invitees',
    pageSize: 20,
  })
  expect(router.state.location.search).not.toHaveProperty('page')
})

it('switching the period updates the URL search', async () => {
  const user = userEvent.setup()
  const { router } = await renderViewControls()

  await user.click(screen.getByRole('combobox', { name: 'Ranking Period' }))
  await user.click(screen.getByRole('option', { name: 'All Time' }))

  expect(router.state.location.search).toMatchObject({ period: 'all' })
})

it('restores the selected metric and period from the URL', async () => {
  await renderViewControls('/inviter-rebate/?metric=invitees&period=year')

  const metricTrigger = screen.getByRole('combobox', {
    name: 'Ranking Metric',
  })
  const periodTrigger = screen.getByRole('combobox', {
    name: 'Ranking Period',
  })
  expect(metricTrigger).toHaveTextContent('Invitee Count')
  expect(periodTrigger).toHaveTextContent('This Year')
})

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
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import type {
  ApiResponse,
  InviterRebateInvitee,
  InviterRebateInviteesPage,
  InviterRebateSummary,
} from '../../types'
import { AffiliateRewardsCard } from '../affiliate-rewards-card'
import { InviterRebateInvitees } from '../inviter-rebate-invitees'

const items: InviterRebateInvitee[] = [
  {
    invitee_masked_name: 'a***e',
    granted_quota: 1_500_000,
    released_quota: 1_000_000,
    locked_quota: 500_000,
    voided_quota: 125_000,
    rebate_count: 3,
  },
  {
    invitee_masked_name: 'a***e',
    granted_quota: 250_000,
    released_quota: 0,
    locked_quota: 250_000,
    voided_quota: 0,
    rebate_count: 1,
  },
  {
    invitee_masked_name: '',
    granted_quota: 0,
    released_quota: 0,
    locked_quota: 0,
    voided_quota: 375_000,
    rebate_count: 2,
  },
  {
    invitee_masked_name: '',
    granted_quota: 750_000,
    released_quota: 750_000,
    locked_quota: 0,
    voided_quota: 0,
    rebate_count: 1,
  },
]
const originalConfig = useSystemConfigStore.getState().config
let client: QueryClient
let i18n: ReturnType<typeof createInstance>

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  i18n = createInstance()
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    resources: {
      en: { translation: {} },
      zhTW: {
        translation: {
          'Invitee contributions': '受邀者貢獻',
          'Released rebates': '已釋放',
        },
      },
      zhCN: {
        translation: {
          'Invitee contributions': '受邀者贡献',
          'Released rebates': '已释放',
        },
      },
    },
  })
  localStorage.clear()
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
})

afterEach(() => {
  cleanup()
  client.clear()
  localStorage.clear()
  useSystemConfigStore.setState({ config: originalConfig })
  vi.restoreAllMocks()
})

function renderInvitees(
  node: ReactNode = <InviterRebateInvitees userId={101} />
) {
  return render(node, {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>{props.children}</TooltipProvider>
        </I18nextProvider>
      </QueryClientProvider>
    ),
  })
}

function page(
  data: InviterRebateInvitee[] = items,
  total = data.length,
  currentPage = 1
) {
  return {
    data: {
      success: true,
      data: { items: data, total, page: currentPage, page_size: 10 },
    },
  }
}

it('duplicate masked names and deleted invitees remain distinct rows with all rebate-state buckets', async () => {
  vi.spyOn(api, 'get').mockResolvedValue(page())
  renderInvitees()
  await screen.findAllByText('a***e')

  const table = screen.getByRole('table')
  expect(within(table).getAllByText('a***e')).toHaveLength(2)
  expect(within(table).getAllByText('Deleted User')).toHaveLength(2)
  const rows = within(table).getAllByRole('row').slice(1)
  expect(
    rows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    )
  ).toEqual([
    ['a***e', '$3', '$2', '$1', '$0.25', '3'],
    ['a***e', '$0.5', '$0', '$0.5', '$0', '1'],
    ['Deleted User', '$0', '$0', '$0', '$0.75', '2'],
    ['Deleted User', '$1.5', '$1.5', '$0', '$0', '1'],
  ])
  expect(
    screen.getByText(/Each invitee may have multiple rebate states/)
  ).toBeVisible()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})

it.each(['business failure', 'network rejection'] as const)(
  'invitee %s shows retry, not a successful empty result',
  async (failure) => {
    const user = userEvent.setup()
    const get = vi.spyOn(api, 'get').mockResolvedValue(page())
    get.mockImplementationOnce(async () => {
      if (failure === 'network rejection') {
        throw new Error('connection unavailable')
      }
      return {
        data: {
          success: false,
          message: 'rebate unavailable',
          data: page().data.data,
        },
      }
    })
    renderInvitees()

    expect(
      await screen.findByText('Failed to load invitee contributions')
    ).toBeVisible()
    expect(
      screen.queryByText('No invitee contributions yet')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('a***e')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findAllByText('a***e')).toHaveLength(2)
    expect(
      screen.queryByText('Failed to load invitee contributions')
    ).not.toBeInTheDocument()
  }
)

it.each([5, 0])(
  'pagination sends p/page_size, preserves pending rows, and resets after total shrinks to %i',
  async (total) => {
    const user = userEvent.setup()
    const secondPage = [{ ...items[0], invitee_masked_name: 's***d' }]
    const remaining =
      total === 0 ? [] : [{ ...items[1], invitee_masked_name: 'r***g' }]
    let finishSecondPage: (response: ReturnType<typeof page>) => void = () => {}
    const pendingSecondPage = new Promise<ReturnType<typeof page>>(
      (resolve) => {
        finishSecondPage = resolve
      }
    )
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(page([items[0]], 25))
      .mockReturnValueOnce(pendingSecondPage)
      .mockResolvedValueOnce(page([], total, 3))
      .mockResolvedValue(page(remaining, total))
    renderInvitees()
    await screen.findByText('a***e')
    const region = screen.getByRole('region', { name: 'Invitee contributions' })
    const nav = screen.getByRole('navigation', { name: 'Page' })
    expect(
      within(nav).getByRole('button', { name: 'Go to previous page' })
    ).toBeDisabled()

    await user.click(
      within(nav).getByRole('button', { name: 'Go to next page' })
    )
    expect(get).toHaveBeenLastCalledWith('/api/inviter_rebate/my_invitees', {
      params: { p: 2, page_size: 10 },
    })
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('a***e')).toBeVisible()
    expect(nav).toHaveTextContent('2 / 3')
    await act(async () => {
      finishSecondPage(page(secondPage, 25, 2))
    })
    await screen.findByText('s***d')
    expect(region).toHaveAttribute('aria-busy', 'false')
    await user.click(
      within(nav).getByRole('button', { name: 'Go to next page' })
    )

    await waitFor(() =>
      expect(get.mock.calls).toEqual([
        [
          '/api/inviter_rebate/my_invitees',
          { params: { p: 1, page_size: 10 } },
        ],
        [
          '/api/inviter_rebate/my_invitees',
          { params: { p: 2, page_size: 10 } },
        ],
        [
          '/api/inviter_rebate/my_invitees',
          { params: { p: 3, page_size: 10 } },
        ],
        [
          '/api/inviter_rebate/my_invitees',
          { params: { p: 1, page_size: 10 } },
        ],
      ])
    )
    if (total === 0) {
      expect(
        await screen.findByText('No invitee contributions yet')
      ).toBeVisible()
      expect(
        screen.getByText(
          'Invitees appear here after their first recorded rebate.'
        )
      ).toBeVisible()
    } else {
      expect(await screen.findByText('r***g')).toBeVisible()
    }
    expect(nav).toHaveTextContent(`Total: ${total}`)
    expect(nav).toHaveTextContent('1 / 1')
    expect(
      within(nav).getByRole('button', { name: 'Go to previous page' })
    ).toBeDisabled()
    expect(
      within(nav).getByRole('button', { name: 'Go to next page' })
    ).toBeDisabled()
  }
)

it('switching the wallet account discards old summary, rows, and page before the new account responds', async () => {
  const user = userEvent.setup()
  const firstSummary: InviterRebateSummary = {
    granted_quota: 49_500_000,
    released_quota: 49_500_000,
    locked_quota: 0,
    voided_quota: 0,
    invitee_count: 1,
    rebate_count: 1,
    tier: {
      aff_count: 1,
      current_percent: 2,
      next_min_invitees: 0,
      next_percent: 0,
    },
  }
  let finishSummary: (response: {
    data: ApiResponse<InviterRebateSummary>
  }) => void = () => {}
  const pendingSummary = new Promise<{
    data: ApiResponse<InviterRebateSummary>
  }>((resolve) => {
    finishSummary = resolve
  })
  let finishInvitees: (response: {
    data: ApiResponse<InviterRebateInviteesPage>
  }) => void = () => {}
  const pendingInvitees = new Promise<{
    data: ApiResponse<InviterRebateInviteesPage>
  }>((resolve) => {
    finishInvitees = resolve
  })
  let account = 101
  const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    if (url === '/api/inviter_rebate/my_summary') {
      return account === 101
        ? { data: { success: true, data: firstSummary } }
        : pendingSummary
    }
    if (account !== 101) return pendingInvitees
    const currentPage = Number((config?.params as { p: number } | undefined)?.p)
    return page(
      [{ ...items[0], invitee_masked_name: `old-account-page-${currentPage}` }],
      20,
      currentPage
    )
  })
  const props = {
    user: null,
    userId: 101,
    affiliateLink: 'https://example.test/old',
    onTransfer: vi.fn(),
  }
  const view = renderInvitees(<AffiliateRewardsCard {...props} />)
  await screen.findByText('old-account-page-1')
  await user.click(screen.getByRole('button', { name: 'Go to next page' }))
  await screen.findByText('old-account-page-2')
  expect(screen.getByRole('navigation')).toHaveTextContent('2 / 2')
  expect(screen.getAllByText('$99')).toHaveLength(2)

  account = 202
  get.mockClear()
  view.rerender(
    <AffiliateRewardsCard
      {...props}
      userId={202}
      affiliateLink='https://example.test/new'
    />
  )
  expect(screen.queryByText('old-account-page-2')).not.toBeInTheDocument()
  expect(screen.queryByText('$99')).not.toBeInTheDocument()
  expect(
    screen.getByRole('status', { name: 'Loading rebate summary' })
  ).toBeVisible()
  expect(
    screen.getByRole('region', { name: 'Invitee contributions' })
  ).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('textbox', { name: 'Referral link' })).toHaveValue(
    'https://example.test/new'
  )
  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/my_invitees', {
    params: { p: 1, page_size: 10 },
  })
  expect(get).not.toHaveBeenCalledWith('/api/inviter_rebate/my_invitees', {
    params: { p: 2, page_size: 10 },
  })

  await act(async () => {
    finishSummary({
      data: {
        success: true,
        data: {
          ...firstSummary,
          granted_quota: 500_000,
          released_quota: 500_000,
        },
      },
    })
    finishInvitees(
      page([{ ...items[1], invitee_masked_name: 'new-account' }], 1)
    )
  })
  expect(await screen.findByText('new-account')).toBeVisible()
  expect(screen.queryByText('$99')).not.toBeInTheDocument()
  expect(screen.getByRole('navigation')).toHaveTextContent('1 / 1')
})

it('an invitees userId change never uses cached rows from the previous account while loading', async () => {
  let finish: (response: ReturnType<typeof page>) => void = () => {}
  const pending = new Promise<ReturnType<typeof page>>((resolve) => {
    finish = resolve
  })
  vi.spyOn(api, 'get').mockResolvedValueOnce(page()).mockReturnValue(pending)
  const view = renderInvitees()
  await screen.findAllByText('a***e')

  view.rerender(<InviterRebateInvitees userId={202} />)
  expect(screen.queryByText('a***e')).not.toBeInTheDocument()
  expect(screen.queryByText('Deleted User')).not.toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Invitee contributions' })
  ).toHaveAttribute('aria-busy', 'true')
  expect(
    screen.queryByText('No invitee contributions yet')
  ).not.toBeInTheDocument()
  await act(async () => {
    finish(page([{ ...items[0], invitee_masked_name: 'new-account' }]))
  })
  expect(await screen.findByText('new-account')).toBeVisible()
  expect(screen.queryByText('a***e')).not.toBeInTheDocument()
})

it('mobile invitee cards label and wrap large amounts and update labels when zhTW changes to zhCN', async () => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query): MediaQueryList => ({
      matches:
        query === '(max-width: 640px)' ||
        query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  )
  vi.spyOn(api, 'get').mockResolvedValue(
    page([
      {
        ...items[0],
        granted_quota: 6_172_839_451_115_000,
        released_quota: 6_172_839_450_615_000,
        rebate_count: 1_234_567_890,
      },
    ])
  )
  await i18n.changeLanguage('zhTW')
  renderInvitees()

  expect(await screen.findByText('a***e')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  const region = screen.getByRole('region', { name: '受邀者貢獻' })
  for (const amount of [
    '$12,345,678,902.23',
    '$12,345,678,901.23',
    '$1',
    '$0.25',
  ]) {
    expect(within(region).getByText(amount)).toBeVisible()
  }
  expect(within(region).getByText('Rebate Total')).toBeVisible()
  expect(within(region).getByText('$12,345,678,902.23').className).toMatch(
    /break-all|\[overflow-wrap:anywhere\]/
  )
  expect(within(region).getByText('1,234,567,890').className).toMatch(
    /break-all|\[overflow-wrap:anywhere\]/
  )
  expect(within(region).getByText('已釋放')).toBeVisible()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled()

  await act(() => i18n.changeLanguage('zhCN'))
  expect(screen.getByRole('region', { name: '受邀者贡献' })).toBeVisible()
  expect(screen.getByText('已释放')).toBeVisible()
  expect(screen.queryByText('已釋放')).not.toBeInTheDocument()
  expect(screen.getByText('$0.25')).toBeVisible()
})

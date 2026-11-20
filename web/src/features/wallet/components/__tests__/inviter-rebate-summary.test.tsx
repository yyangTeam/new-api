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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { createInstance } from 'i18next'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { createAppQueryClient } from '@/lib/query-client'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import type {
  ApiResponse,
  InviterRebateSummary as Summary,
  UserWalletData,
} from '../../types'
import { AffiliateRewardsCard } from '../affiliate-rewards-card'
import { InviterRebateSummary } from '../inviter-rebate-summary'

const summary: Summary = {
  granted_quota: 7_500_000,
  released_quota: 5_000_000,
  locked_quota: 2_500_000,
  voided_quota: 125_000,
  invitee_count: 3,
  rebate_count: 6,
  tier: {
    aff_count: 12,
    current_percent: 3,
    next_min_invitees: 20,
    next_percent: 5,
  },
}
const walletUser: UserWalletData = {
  id: 101,
  username: 'inviter',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  aff_quota: 500_000,
  aff_history_quota: 20_000_000,
  aff_count: 12,
  group: 'default',
}
const cardProps = {
  user: walletUser,
  userId: 101,
  affiliateLink: 'https://example.test/register?aff=sample',
  onTransfer: vi.fn(),
}
const emptyPage = { items: [], total: 0, page: 1, page_size: 10 }
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
    resources: {
      en: { translation: {} },
      zhTW: {
        translation: {
          'Locked rebates': '鎖定返利',
          'Transferable rewards': '可轉移獎勵',
        },
      },
      zhCN: {
        translation: {
          'Locked rebates': '锁定返利',
          'Transferable rewards': '可转移奖励',
        },
      },
    },
    initAsync: false,
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

function renderRebates(node: ReactNode) {
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

function mockSummary(data: Summary = summary) {
  return vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data: {
      success: true,
      data: url === '/api/inviter_rebate/my_summary' ? data : emptyPage,
    },
  }))
}

it('shows ledger buckets separately from transferable legacy rewards and bound-invitee tier progress', async () => {
  const get = mockSummary()
  renderRebates(<AffiliateRewardsCard {...cardProps} />)
  const overview = screen.getByRole('region', {
    name: 'Recharge rebate overview',
  })

  await within(overview).findByText('Locked rebates')
  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/my_summary')
  const amounts = within(overview).getAllByRole('definition')
  expect(amounts.map((amount) => amount.textContent)).toEqual([
    '$5',
    '$10',
    '$15',
  ])
  expect(
    screen.getByText('Transferable rewards').nextElementSibling
  ).toHaveTextContent('$1')
  expect(screen.getByText('Total Earned').nextElementSibling).toHaveTextContent(
    '$40'
  )
  expect(within(overview).getByText('Rebated Invitees: 3')).toBeVisible()
  expect(within(overview).getByText('Rebate Records: 6')).toBeVisible()
  expect(within(overview).getByText('Voided: $0.25')).toBeVisible()
  expect(
    within(overview).getByText(
      /Released totals are not your transferable balance/
    )
  ).toBeVisible()
  const progress = within(overview).getByRole('progressbar')
  expect(progress).toHaveAttribute('aria-valuenow', '12')
  expect(progress).toHaveAttribute('aria-valuemax', '20')
  expect(progress).toHaveAttribute('aria-valuetext', '12 of 20 bound invitees')
  expect(progress).toHaveAccessibleName(
    'Invite 8 more people to reach the 5% tier'
  )
})

it('below the first configured tier shows the actual base rate and remaining first-tier threshold', async () => {
  mockSummary({
    ...summary,
    tier: {
      aff_count: 2,
      current_percent: 1.5,
      next_min_invitees: 5,
      next_percent: 3,
    },
  })
  renderRebates(<InviterRebateSummary userId={101} />)

  expect(await screen.findByText('1.5%')).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    '2 of 5 bound invitees'
  )
  expect(
    screen.getByText('Invite 3 more people to reach the 3% tier')
  ).toBeVisible()
})

it.each([
  {
    configuration: 'flat rate with no configured tiers',
    aff_count: 0,
    current_percent: 2,
  },
  {
    configuration: 'highest configured tier',
    aff_count: 100,
    current_percent: 8,
  },
])(
  'with $configuration does not pretend that a next tier or maximum achievement exists',
  async ({ aff_count, current_percent }) => {
    mockSummary({
      ...summary,
      tier: {
        aff_count,
        current_percent,
        next_min_invitees: 0,
        next_percent: 0,
      },
    })
    renderRebates(<InviterRebateSummary userId={101} />)

    expect(
      await screen.findByText(
        'No next rebate tier is available under the current configuration.'
      )
    ).toBeVisible()
    expect(screen.getByText(`${current_percent}%`)).toBeVisible()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/highest tier|maximum tier|Invite .*more people/i)
    ).not.toBeInTheDocument()
  }
)

it('independently loading rebate sections do not block copying or transferring available rewards', async () => {
  const user = userEvent.setup()
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue()
  let finishSummary: (value: { data: ApiResponse<Summary> }) => void = () => {}
  const pendingSummary = new Promise<{ data: ApiResponse<Summary> }>(
    (resolve) => {
      finishSummary = resolve
    }
  )
  let finishInvitees: (value: {
    data: ApiResponse<typeof emptyPage>
  }) => void = () => {}
  const pendingInvitees = new Promise<{ data: ApiResponse<typeof emptyPage> }>(
    (resolve) => {
      finishInvitees = resolve
    }
  )
  vi.spyOn(api, 'get').mockImplementation((url) =>
    url === '/api/inviter_rebate/my_summary' ? pendingSummary : pendingInvitees
  )
  renderRebates(<AffiliateRewardsCard {...cardProps} />)

  expect(
    screen.getByRole('status', { name: 'Loading rebate summary' })
  ).toBeVisible()
  const invitees = screen.getByRole('region', { name: 'Invitee contributions' })
  expect(invitees).toHaveAttribute('aria-busy', 'true')
  expect(
    screen.queryByText('No invitee contributions yet')
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText('Locked rebates', { selector: 'dt' })
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Copy referral link' }))
  expect(writeText).toHaveBeenCalledWith(cardProps.affiliateLink)
  expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Transfer to Balance' }))
  expect(cardProps.onTransfer).toHaveBeenCalledOnce()

  await act(async () => {
    finishSummary({ data: { success: true, data: summary } })
  })
  await screen.findByText('Locked rebates', { selector: 'dt' })
  expect(invitees).toHaveAttribute('aria-busy', 'true')
  await act(async () => {
    finishInvitees({ data: { success: true, data: emptyPage } })
  })
  expect(
    await within(invitees).findByText('No invitee contributions yet')
  ).toBeVisible()
  expect(invitees).toHaveAttribute('aria-busy', 'false')
})

it.each(['business failure', 'network rejection', 'missing data'] as const)(
  'summary %s renders retry instead of zero balances and leaves referral actions available',
  async (failure) => {
    const user = userEvent.setup()
    const get = mockSummary()
    get.mockImplementationOnce(async () => {
      if (failure === 'network rejection') {
        throw new Error('connection unavailable')
      }
      if (failure === 'missing data') return { data: { success: true } }
      return {
        data: { success: false, message: 'rebate unavailable', data: summary },
      }
    })
    renderRebates(<AffiliateRewardsCard {...cardProps} />)
    const overview = screen.getByRole('region', {
      name: 'Recharge rebate overview',
    })

    expect(
      await within(overview).findByText('Failed to load rebate summary')
    ).toBeVisible()
    expect(within(overview).queryByRole('definition')).not.toBeInTheDocument()
    expect(within(overview).queryByText('$0')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy referral link' })
    ).toBeEnabled()
    await user.click(
      screen.getByRole('button', { name: 'Transfer to Balance' })
    )
    expect(cardProps.onTransfer).toHaveBeenCalledOnce()
    await user.click(within(overview).getByRole('button', { name: 'Retry' }))

    expect(await within(overview).findByText('Locked rebates')).toBeVisible()
    expect(within(overview).getByText('$15')).toBeVisible()
    expect(
      within(overview).queryByText('Failed to load rebate summary')
    ).not.toBeInTheDocument()
  }
)

it('optional rebate HTTP 500 errors stay on the wallet with usable referral actions and independent retries', async () => {
  const user = userEvent.setup()
  const redirect = vi.fn()
  client.clear()
  client = createAppQueryClient(redirect)
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, retry: false },
  })
  const error = new AxiosError(
    'optional rebates unavailable',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      status: 500,
      statusText: 'Internal Server Error',
      data: { message: 'optional rebates unavailable' },
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  )
  const get = vi.spyOn(api, 'get').mockRejectedValue(error)
  renderRebates(<AffiliateRewardsCard {...cardProps} />)
  const overview = screen.getByRole('region', {
    name: 'Recharge rebate overview',
  })
  const invitees = screen.getByRole('region', { name: 'Invitee contributions' })

  expect(
    await within(overview).findByText('Failed to load rebate summary')
  ).toBeVisible()
  expect(
    await within(invitees).findByText('Failed to load invitee contributions')
  ).toBeVisible()
  expect(redirect).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Copy referral link' })
  ).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Transfer to Balance' }))
  expect(cardProps.onTransfer).toHaveBeenCalledOnce()
  get.mockImplementation(async (url) => ({
    data: {
      success: true,
      data: url === '/api/inviter_rebate/my_summary' ? summary : emptyPage,
    },
  }))
  await user.click(within(overview).getByRole('button', { name: 'Retry' }))
  expect(await within(overview).findByText('Locked rebates')).toBeVisible()
  expect(
    within(invitees).getByText('Failed to load invitee contributions')
  ).toBeVisible()
  await user.click(within(invitees).getByRole('button', { name: 'Retry' }))
  expect(
    await within(invitees).findByText('No invitee contributions yet')
  ).toBeVisible()
  expect(redirect).not.toHaveBeenCalled()
})

it('compliance and user-loading disable transfer without changing rebate visibility or copy access', async () => {
  const user = userEvent.setup()
  mockSummary()
  const view = renderRebates(
    <AffiliateRewardsCard {...cardProps} complianceConfirmed={false} />
  )
  await screen.findByText('Locked rebates', { selector: 'dt' })
  const transfer = screen.getByRole('button', { name: 'Transfer to Balance' })

  expect(transfer).toBeDisabled()
  expect(
    screen.getByText(
      /disabled until the administrator confirms compliance terms/
    )
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Copy referral link' })
  ).toBeEnabled()
  await user.click(transfer)
  expect(cardProps.onTransfer).not.toHaveBeenCalled()

  view.rerender(
    <AffiliateRewardsCard {...cardProps} complianceConfirmed userLoading />
  )
  expect(transfer).toBeDisabled()
  expect(
    screen.getByText('Transferable rewards').nextElementSibling
  ).not.toHaveTextContent('$1')
  expect(screen.getByText('Locked rebates', { selector: 'dt' })).toBeVisible()
  view.rerender(
    <AffiliateRewardsCard {...cardProps} complianceConfirmed loading />
  )
  expect(
    screen.queryByRole('textbox', { name: 'Referral link' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Copy referral link' })
  ).not.toBeInTheDocument()
  expect(transfer).toBeEnabled()
  await user.click(transfer)
  expect(cardProps.onTransfer).toHaveBeenCalledOnce()

  view.rerender(
    <AffiliateRewardsCard
      {...cardProps}
      user={{ ...walletUser, aff_quota: 0 }}
    />
  )
  expect(
    screen.queryByRole('button', { name: 'Transfer to Balance' })
  ).not.toBeInTheDocument()
})

it('an empty referral link disables copy and never writes to the clipboard', async () => {
  const user = userEvent.setup()
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue()
  mockSummary()
  renderRebates(<AffiliateRewardsCard {...cardProps} affiliateLink='' />)
  const copy = screen.getByRole('button', { name: 'Copy referral link' })

  await user.click(copy)
  expect(copy).toBeDisabled()
  expect(writeText).not.toHaveBeenCalled()
})

it('switching zhTW to zhCN updates summary and wallet labels without invalid Intl locale errors', async () => {
  mockSummary()
  await i18n.changeLanguage('zhTW')
  renderRebates(<AffiliateRewardsCard {...cardProps} />)

  expect(await screen.findByText('鎖定返利', { selector: 'dt' })).toBeVisible()
  expect(screen.getByText('可轉移獎勵').nextElementSibling).toHaveTextContent(
    '$1'
  )
  await act(() => i18n.changeLanguage('zhCN'))
  expect(screen.getByText('锁定返利', { selector: 'dt' })).toBeVisible()
  expect(screen.getByText('可转移奖励').nextElementSibling).toHaveTextContent(
    '$1'
  )
  expect(screen.queryByText('鎖定返利')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    '12 of 20 bound invitees'
  )
})

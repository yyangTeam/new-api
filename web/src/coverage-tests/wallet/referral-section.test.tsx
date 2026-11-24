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
import { createInstance } from 'i18next'
import type { ComponentProps, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, expect, it, type Mock, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AffiliateRewardsCard } from '@/features/wallet/components/affiliate-rewards-card'
import type {
  ApiResponse,
  InviterRebateInviteesPage,
  InviterRebateSummary,
  UserWalletData,
} from '@/features/wallet/types'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import zhTW from '@/i18n/locales/zh-TW.json'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

const wallet: UserWalletData = {
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
const summary: InviterRebateSummary = {
  granted_quota: 7_500_000,
  released_quota: 5_000_000,
  locked_quota: 2_500_000,
  voided_quota: 125_000,
  rebate_count: 6,
  invitee_count: 3,
  first_topup_percent: 0,
  tiers: [
    { min_invitees: 0, percent: 3 },
    { min_invitees: 20, percent: 5 },
  ],
  tier: {
    aff_count: 12,
    current_percent: 3,
    next_min_invitees: 20,
    next_percent: 5,
  },
}
const zeroLedger: InviterRebateSummary = {
  ...summary,
  granted_quota: 0,
  released_quota: 0,
  locked_quota: 0,
  voided_quota: 0,
  rebate_count: 0,
  invitee_count: 0,
}
const emptyPage: InviterRebateInviteesPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
}
const populatedPage: InviterRebateInviteesPage = {
  ...emptyPage,
  total: 3,
  items: [
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
  ],
}
const affiliateLink = 'https://example.test/register?aff=sample'
const originalConfig = useSystemConfigStore.getState().config
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard'
)
type ApiResult<T> = { data: ApiResponse<T> }
let client: QueryClient
let i18n: ReturnType<typeof createInstance>
let onTransfer: Mock<() => void>

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  onTransfer = vi.fn<() => void>()
  i18n = createInstance()
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    resources: { en, fr, zhCN: zh, zhTW },
    interpolation: { escapeValue: false },
  })
  localStorage.clear()
  sessionStorage.clear()
  useSystemConfigStore.getState().setConfig({
    currency: { ...DEFAULT_CURRENCY_CONFIG },
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useSystemConfigStore.setState({ config: originalConfig })
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

function ReferralProviders(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>{props.children}</TooltipProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

function renderReferral(
  props: Partial<ComponentProps<typeof AffiliateRewardsCard>> = {}
) {
  return render(
    <AffiliateRewardsCard
      user={wallet}
      userId={101}
      affiliateLink={affiliateLink}
      onTransfer={onTransfer}
      {...props}
    />,
    { wrapper: ReferralProviders }
  )
}

function mockResponses(data = summary, contributions = emptyPage) {
  return vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/inviter_rebate/my_summary') {
      return { data: { success: true, data } }
    }
    if (url === '/api/inviter_rebate/my_invitees') {
      return { data: { success: true, data: contributions } }
    }
    throw new Error(`Unexpected wallet request: ${url}`)
  })
}

function pendingResponse<T>() {
  let resolve = (_response: ApiResult<T>): void => {}
  const promise = new Promise<ApiResult<T>>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

it('keeps transferable, historical and ledger amounts distinct and displays masked contribution buckets', async () => {
  const get = mockResponses(summary, populatedPage)
  renderReferral()
  const overview = screen.getByRole('region', {
    name: 'Recharge rebate overview',
  })
  await within(overview).findByText('Rebate Total')

  expect(
    screen.getByText('Transferable rewards').nextElementSibling
  ).toHaveTextContent('$1')
  expect(screen.getByText('Total Earned').nextElementSibling).toHaveTextContent(
    '$40'
  )
  expect(screen.getByText('Invites').nextElementSibling).toHaveTextContent('12')
  expect(
    within(overview)
      .getAllByRole('definition')
      .map((node) => node.textContent)
  ).toEqual(['$15', '$10', '$5', '$0.25'])
  expect(
    within(overview).getByText(
      /Released totals are not your transferable balance/
    )
  ).toBeVisible()
  expect(within(overview).getByText('Rebated Invitees: 3')).toBeVisible()
  expect(within(overview).getByText('Rebate Records: 6')).toBeVisible()

  const contributions = screen.getByRole('region', {
    name: 'Invitee contributions',
  })
  await within(contributions).findAllByText('a***e')
  const rows = within(within(contributions).getByRole('table'))
    .getAllByRole('row')
    .slice(1)
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
  ])
  expect(within(contributions).queryByRole('checkbox')).not.toBeInTheDocument()
  expect(
    within(contributions).queryByRole('button', {
      name: 'Copy invitation link',
    })
  ).not.toBeInTheDocument()
  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/my_summary')
  expect(get).toHaveBeenCalledWith('/api/inviter_rebate/my_invitees', {
    params: { p: 1, page_size: 10 },
  })
})

it.each([
  { layout: 'desktop', mobile: false },
  { layout: 'mobile', mobile: true },
])(
  '$layout empty contributions and the main link expose working copy actions with success feedback',
  async (scenario) => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query): MediaQueryList => ({
        matches:
          query === '(max-width: 640px)'
            ? scenario.mobile
            : query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    )
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    mockResponses(zeroLedger)
    renderReferral()
    const contributions = screen.getByRole('region', {
      name: 'Invitee contributions',
    })
    await within(contributions).findByText('No invitee contributions yet')
    expect(
      within(contributions).getByText(
        /This list does not include every registered invitee/
      )
    ).toBeVisible()
    const secondaryCopy = within(contributions).getByRole('button', {
      name: 'Copy invitation link',
    })
    expect(
      screen.getAllByRole('button', { name: 'Copy invitation link' })
    ).toHaveLength(2)
    expect(
      screen.getByRole('textbox', { name: 'Referral link' })
    ).toHaveAttribute('readonly')
    await user.click(
      screen.getAllByRole('button', { name: 'Copy invitation link' })[0]
    )
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible()
    expect(secondaryCopy).toHaveAccessibleName('Copy invitation link')
    secondaryCopy.focus()
    await user.keyboard('{Enter}')
    expect(
      await within(contributions).findByRole('button', { name: 'Copied' })
    ).toBeVisible()
    expect(writeText.mock.calls).toEqual([[affiliateLink], [affiliateLink]])
  }
)

it('loading hides both copy actions and a missing link disables the main action without copying', async () => {
  const user = userEvent.setup()
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue()
  mockResponses()
  const view = renderReferral({ loading: true })
  await screen.findByText('No invitee contributions yet')
  expect(
    screen.getByRole('status', { name: 'Loading referral link' })
  ).toBeVisible()
  expect(
    screen.queryByRole('textbox', { name: 'Referral link' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Copy invitation link' })
  ).not.toBeInTheDocument()

  view.rerender(
    <AffiliateRewardsCard
      user={wallet}
      userId={101}
      affiliateLink=''
      onTransfer={onTransfer}
    />
  )
  const copy = screen.getByRole('button', { name: 'Copy invitation link' })
  expect(copy).toBeDisabled()
  expect(screen.getByRole('textbox', { name: 'Referral link' })).toHaveValue('')
  expect(screen.getByText('Referral link is not available yet.')).toBeVisible()
  await user.click(copy)
  expect(writeText).not.toHaveBeenCalled()
})

it('compliance and user loading disable transfer, but link loading does not; zero available quota hides it', async () => {
  const user = userEvent.setup()
  mockResponses()
  const props = { user: wallet, userId: 101, affiliateLink, onTransfer }
  const view = renderReferral({ complianceConfirmed: false })
  await screen.findByText('Rebate Total')
  const transfer = screen.getByRole('button', { name: 'Transfer to Balance' })
  expect(transfer).toBeDisabled()
  expect(
    screen.getByText(
      /disabled until the administrator confirms compliance terms/
    )
  ).toBeVisible()
  await user.click(transfer)
  view.rerender(
    <AffiliateRewardsCard {...props} complianceConfirmed userLoading />
  )
  expect(transfer).toBeDisabled()
  expect(
    screen.getByText('Transferable rewards').closest('dl')
  ).toHaveAttribute('aria-busy', 'true')
  expect(
    screen.getByText('Transferable rewards').nextElementSibling
  ).not.toHaveTextContent('$1')
  await user.click(transfer)
  expect(onTransfer).not.toHaveBeenCalled()

  view.rerender(<AffiliateRewardsCard {...props} loading />)
  expect(transfer).toBeEnabled()
  await user.click(transfer)
  expect(onTransfer).toHaveBeenCalledOnce()
  view.rerender(
    <AffiliateRewardsCard {...props} user={{ ...wallet, aff_quota: 0 }} />
  )
  expect(
    screen.queryByRole('button', { name: 'Transfer to Balance' })
  ).not.toBeInTheDocument()
  expect(screen.getByText('Total Earned').nextElementSibling).toHaveTextContent(
    '$40'
  )
  const overview = screen.getByRole('region', {
    name: 'Recharge rebate overview',
  })
  expect(
    within(overview).getByText('Released rebates').closest('dt')
      ?.nextElementSibling
  ).toHaveTextContent('$10')
})

it.each([
  {
    state: 'historical ledger',
    data: summary,
    amounts: ['$15', '$10', '$5', '$0.25'],
  },
  {
    state: 'empty ledger',
    data: zeroLedger,
    amounts: ['$0', '$0', '$0', '$0'],
  },
])(
  'all configured rates zero with $state shows only a rate notice and preserves rewards and copying',
  async (scenario) => {
    mockResponses({
      ...scenario.data,
      first_topup_percent: 0,
      tiers: [{ min_invitees: 0, percent: 0 }],
      tier: {
        aff_count: 12,
        current_percent: 0,
        next_min_invitees: 0,
        next_percent: 0,
      },
    })
    renderReferral()
    const overview = screen.getByRole('region', {
      name: 'Recharge rebate overview',
    })
    expect(
      await within(overview).findByText(
        'No recharge rebate rate is currently configured.'
      )
    ).toBeVisible()
    expect(
      within(overview)
        .getAllByRole('definition')
        .map((node) => node.textContent)
    ).toEqual(scenario.amounts)
    expect(
      within(overview).queryByText('No recharge rebates yet')
    ).not.toBeInTheDocument()
    expect(
      within(overview).queryByText(/For every .* your friends recharge/)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Transfer to Balance' })
    ).toBeEnabled()
    expect(
      screen.getAllByRole('button', { name: 'Copy invitation link' })[0]
    ).toBeEnabled()
  }
)

it.each([
  { state: 'no ledger amounts or records', data: zeroLedger, onboarding: true },
  {
    state: 'historical amounts',
    data: { ...summary, rebate_count: 0 },
    onboarding: false,
  },
  {
    state: 'only voided history',
    data: { ...zeroLedger, voided_quota: 125_000 },
    onboarding: false,
  },
  {
    state: 'records with zero amounts',
    data: { ...zeroLedger, rebate_count: 1 },
    onboarding: false,
  },
])(
  'positive current rate and $state shows onboarding only for a genuinely empty ledger',
  async (scenario) => {
    mockResponses(scenario.data)
    renderReferral()
    const overview = screen.getByRole('region', {
      name: 'Recharge rebate overview',
    })
    await within(overview).findByText('Rebate Total')
    expect(
      within(overview).getByText('For every $10 your friends recharge')
    ).toBeVisible()
    expect(within(overview).getByText('you earn $0.3')).toBeVisible()
    if (scenario.onboarding) {
      expect(
        within(overview).getByText('No recharge rebates yet')
      ).toBeVisible()
      expect(
        within(overview).getByText(
          'Share your referral link. Recorded recharge rebates will appear here.'
        )
      ).toBeVisible()
    } else {
      expect(
        within(overview).queryByText('No recharge rebates yet')
      ).not.toBeInTheDocument()
    }
    expect(
      within(overview).queryByText(
        'No recharge rebate rate is currently configured.'
      )
    ).not.toBeInTheDocument()
  }
)

it.each([
  {
    incentive: 'first top-up only',
    first_topup_percent: 15,
    tiers: [],
    tier: {
      aff_count: 12,
      current_percent: 0,
      next_min_invitees: 0,
      next_percent: 0,
    },
    explanation: 'Friends first top-ups earn 15% rebates',
  },
  {
    incentive: 'a future positive tier',
    first_topup_percent: 0,
    tiers: [
      { min_invitees: 0, percent: 0 },
      { min_invitees: 20, percent: 5 },
    ],
    tier: {
      aff_count: 12,
      current_percent: 0,
      next_min_invitees: 20,
      next_percent: 5,
    },
    explanation: 'Invite 8 more people to reach the 5% tier',
  },
  {
    incentive: 'a returned next rate without a full ladder',
    first_topup_percent: 0,
    tiers: [],
    tier: {
      aff_count: 12,
      current_percent: 0,
      next_min_invitees: 20,
      next_percent: 5,
    },
    explanation: 'Invite 8 more people to reach the 5% tier',
  },
])(
  'zero current rate with $incentive retains real incentive conditions instead of claiming rates are unconfigured',
  async (scenario) => {
    mockResponses({
      ...zeroLedger,
      first_topup_percent: scenario.first_topup_percent,
      tiers: scenario.tiers,
      tier: scenario.tier,
    })
    renderReferral()
    const overview = screen.getByRole('region', {
      name: 'Recharge rebate overview',
    })
    expect(
      await within(overview).findByText(scenario.explanation)
    ).toBeVisible()
    expect(within(overview).getByText('No recharge rebates yet')).toBeVisible()
    expect(
      within(overview).queryByText(
        'No recharge rebate rate is currently configured.'
      )
    ).not.toBeInTheDocument()
    expect(
      within(overview).queryByText(/For every .* your friends recharge/)
    ).not.toBeInTheDocument()
    if (scenario.tier.next_min_invitees > 0) {
      expect(within(overview).getByRole('progressbar')).toHaveAttribute(
        'aria-valuetext',
        '12 of 20 bound invitees'
      )
      expect(within(overview).getByRole('progressbar')).toHaveAccessibleName(
        scenario.explanation
      )
      if (scenario.tiers.length > 0) {
        expect(within(overview).getByText('Next tier')).toBeVisible()
      }
    } else {
      expect(
        within(overview).queryByRole('progressbar')
      ).not.toBeInTheDocument()
      expect(within(overview).queryByText('Next tier')).not.toBeInTheDocument()
    }
  }
)

it('pending summary and contributions resolve independently without blocking available wallet actions', async () => {
  const user = userEvent.setup()
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue()
  const pendingSummary = pendingResponse<InviterRebateSummary>()
  const pendingInvitees = pendingResponse<InviterRebateInviteesPage>()
  const get = mockResponses()
  get.mockImplementation((url) =>
    url === '/api/inviter_rebate/my_summary'
      ? pendingSummary.promise
      : pendingInvitees.promise
  )
  renderReferral()
  const contributions = screen.getByRole('region', {
    name: 'Invitee contributions',
  })
  expect(
    screen.getByRole('status', { name: 'Loading rebate summary' })
  ).toBeVisible()
  expect(contributions).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByText('No recharge rebates yet')).not.toBeInTheDocument()
  expect(
    within(contributions).queryByText('No invitee contributions yet')
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Copy invitation link' }))
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible()
  expect(writeText).toHaveBeenCalledWith(affiliateLink)
  await user.click(screen.getByRole('button', { name: 'Transfer to Balance' }))
  expect(onTransfer).toHaveBeenCalledOnce()

  await act(async () =>
    pendingSummary.resolve({ data: { success: true, data: summary } })
  )
  await screen.findByText('Rebate Total')
  expect(contributions).toHaveAttribute('aria-busy', 'true')
  await act(async () =>
    pendingInvitees.resolve({ data: { success: true, data: emptyPage } })
  )
  expect(
    await within(contributions).findByText('No invitee contributions yet')
  ).toBeVisible()
  expect(contributions).toHaveAttribute('aria-busy', 'false')
})

it('summary business failure and contribution rejection show separate retries, never fabricated zero or empty success', async () => {
  const user = userEvent.setup()
  const get = mockResponses()
  get.mockImplementation(async (url) => {
    if (url === '/api/inviter_rebate/my_summary') {
      return {
        data: { success: false, message: 'Summary unavailable', data: summary },
      }
    }
    throw new Error('Contributions unavailable')
  })
  renderReferral()
  const overview = screen.getByRole('region', {
    name: 'Recharge rebate overview',
  })
  const contributions = screen.getByRole('region', {
    name: 'Invitee contributions',
  })
  expect(
    await within(overview).findByText('Failed to load rebate summary')
  ).toBeVisible()
  expect(
    await within(contributions).findByText(
      'Failed to load invitee contributions'
    )
  ).toBeVisible()
  expect(within(overview).queryByRole('definition')).not.toBeInTheDocument()
  expect(
    within(contributions).queryByText('No invitee contributions yet')
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Copy invitation link' })
  ).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Transfer to Balance' })
  ).toBeEnabled()

  const pendingSummary = pendingResponse<InviterRebateSummary>()
  get.mockReturnValueOnce(pendingSummary.promise)
  await user.click(within(overview).getByRole('button', { name: 'Retry' }))
  expect(
    screen.getByRole('status', { name: 'Loading rebate summary' })
  ).toBeVisible()
  expect(
    within(contributions).getByText('Failed to load invitee contributions')
  ).toBeVisible()
  await act(async () =>
    pendingSummary.resolve({ data: { success: true, data: summary } })
  )
  expect(await within(overview).findByText('Rebate Total')).toBeVisible()
  expect(
    within(contributions).getByText('Failed to load invitee contributions')
  ).toBeVisible()

  const pendingInvitees = pendingResponse<InviterRebateInviteesPage>()
  get.mockReturnValueOnce(pendingInvitees.promise)
  await user.click(within(contributions).getByRole('button', { name: 'Retry' }))
  expect(contributions).toHaveAttribute('aria-busy', 'true')
  expect(within(overview).getByText('Rebate Total')).toBeVisible()
  expect(
    within(contributions).queryByText('No invitee contributions yet')
  ).not.toBeInTheDocument()
  await act(async () =>
    pendingInvitees.resolve({ data: { success: true, data: populatedPage } })
  )
  expect(await within(contributions).findByText('Deleted User')).toBeVisible()
  expect(contributions).toHaveAttribute('aria-busy', 'false')
  expect(
    within(contributions).queryByText('Failed to load invitee contributions')
  ).not.toBeInTheDocument()
})

it('switching real zhTW, zhCN and French translations updates wallet, ledger and contribution labels and numbers', async () => {
  mockResponses(summary, populatedPage)
  await i18n.changeLanguage('zhTW')
  renderReferral({ user: { ...wallet, aff_count: 1234 } })
  expect(
    await screen.findByText('回饋總額', { selector: 'dt span' })
  ).toBeVisible()
  expect(screen.getByRole('region', { name: '受邀使用者貢獻' })).toBeVisible()
  expect(screen.getByRole('button', { name: '複製邀請連結' })).toBeEnabled()
  expect(
    screen.getByText('可轉入餘額的獎勵').nextElementSibling
  ).toHaveTextContent('$1')
  expect(
    screen.getByText('邀請', { selector: 'dt' }).nextElementSibling
  ).toHaveTextContent('1,234')

  await act(() => i18n.changeLanguage('zhCN'))
  expect(screen.getByRole('region', { name: '被邀请用户贡献' })).toBeVisible()
  expect(screen.getByText('返利总额', { selector: 'dt span' })).toBeVisible()
  expect(screen.getByRole('button', { name: '复制邀请链接' })).toBeEnabled()
  expect(screen.queryByText('可轉入餘額的獎勵')).not.toBeInTheDocument()
  await act(() => i18n.changeLanguage('fr'))
  expect(
    screen.getByRole('region', { name: 'Contributions des invités' })
  ).toBeVisible()
  expect(
    screen.getByText('Total des remises', { selector: 'dt span' })
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Copier le lien d’invitation' })
  ).toBeEnabled()
  expect(
    screen.getByText('Invitations', { selector: 'dt' }).nextElementSibling
  ).toHaveTextContent('1 234')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')
})

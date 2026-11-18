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
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { QuotaSettingsSection } from '../quota-settings-section'
import {
  INVITER_REBATE_MAX_TIERS,
  validateInviterRebateTiers,
} from '../../utils/inviter-rebate-tiers'

const baseDefaultValues = {
  QuotaForNewUser: 0,
  QuotaForInviter: 0,
  QuotaForInvitee: 0,
  InviterRebatePercent: 0,
  InviterRebateFirstTopUpPercent: 0,
  InviterRebateConsumeUnlockQuota: 0,
  InviterRebateMaxPerTopup: 0,
  InviterRebateMonthlyMax: 0,
  InviterRebateSelfInviteCheck: true,
  InviterRebateLockExpiryDays: 0,
  TopUpLink: '',
  quota_setting: {
    enable_free_model_pre_consume: true,
    trust_quota_usd: 10,
    pre_consume_multiplier: 1,
  },
}

function Fixture({ tiers }: { tiers: string }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <QuotaSettingsSection
          defaultValues={{
            ...baseDefaultValues,
            inviter_rebate_setting: { tiers },
          }}
        />
      </SettingsPageProvider>
    </>
  )
}

async function renderTiersSettings(tiers = '[]') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <Fixture tiers={tiers} /> }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByText('Inviter Rebate Tiers')
}

beforeEach(() => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
})

type OptionPutCall = [url: string, data: { key: string; value: string }]

function tierPutCalls(): OptionPutCall[] {
  const calls = vi.mocked(api.put).mock.calls as unknown as OptionPutCall[]
  return calls.filter(([, data]) => data?.key === 'inviter_rebate_setting.tiers')
}

function getSavedTiersValue(): unknown {
  const calls = tierPutCalls()
  expect(calls.length).toBeGreaterThan(0)
  return JSON.parse(calls[0][1].value)
}

test('adding a tier and setting its percent saves the tiers option', async () => {
  const user = userEvent.setup()
  await renderTiersSettings('[]')

  expect(
    screen.getByText(
      'No rebate tiers configured. The flat rebate percent applies. Add a tier below to get started.'
    )
  ).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Add tier' }))
  const percentInput = screen.getByRole('spinbutton', {
    name: 'Rebate percent 1',
  })
  await user.clear(percentInput)
  await user.type(percentInput, '5')

  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  expect(getSavedTiersValue()).toEqual([{ min_invitees: 0, percent: 5 }])
})

test('editing and removing tiers saves the updated array', async () => {
  const user = userEvent.setup()
  await renderTiersSettings(
    '[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10}]'
  )

  const minInput = screen.getByRole('spinbutton', {
    name: 'Minimum invitees 2',
  })
  await user.clear(minInput)
  await user.type(minInput, '21')

  await user.click(screen.getByRole('button', { name: 'Remove tier 1' }))

  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  expect(getSavedTiersValue()).toEqual([{ min_invitees: 21, percent: 10 }])
})

test('removing every tier saves [] which disables tiers', async () => {
  const user = userEvent.setup()
  await renderTiersSettings('[{"min_invitees":0,"percent":5}]')

  await user.click(screen.getByRole('button', { name: 'Remove tier 1' }))
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() => expect(api.put).toHaveBeenCalled())
  expect(getSavedTiersValue()).toEqual([])
})

test('non-increasing minimum invitees shows an error and prevents saving', async () => {
  await renderTiersSettings(
    '[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10}]'
  )

  const minInput = screen.getByRole('spinbutton', {
    name: 'Minimum invitees 2',
  })
  fireEvent.change(minInput, { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() =>
    expect(
      screen.getByText(
        'Inviter rebate tiers must be ordered by strictly increasing minimum invitees'
      )
    ).toBeInTheDocument()
  )
  expect(tierPutCalls()).toHaveLength(0)
})

test('empty tier input falls back to 0 instead of breaking the value', async () => {
  await renderTiersSettings('[{"min_invitees":0,"percent":5}]')

  const percentInput = screen.getByRole('spinbutton', {
    name: 'Rebate percent 1',
  })
  fireEvent.change(percentInput, { target: { value: '' } })
  expect(percentInput).toHaveValue(0)
})

test('add tier is capped at the maximum tier count', async () => {
  const maxTiers = Array.from({ length: INVITER_REBATE_MAX_TIERS }, (_, i) => ({
    min_invitees: i,
    percent: 1,
  }))
  await renderTiersSettings(JSON.stringify(maxTiers))

  expect(
    screen.getByRole('button', { name: 'Add tier' })
  ).toBeDisabled()
})

test.each([
  { name: 'empty string', value: '' },
  { name: 'null', value: 'null' },
  { name: 'empty array', value: '[]' },
])('validation accepts tiers off ($name)', ({ value }) => {
  expect(validateInviterRebateTiers(value)).toEqual({ valid: true })
})

test.each([
  {
    name: 'not a JSON array',
    value: '{"min_invitees":0}',
    messageKey: 'Inviter rebate tiers must be a JSON array',
  },
  {
    name: 'malformed JSON',
    value: '[{"min_invitees":0',
    messageKey: 'Inviter rebate tiers must be a JSON array',
  },
  {
    name: 'percent above 100',
    value: '[{"min_invitees":0,"percent":101}]',
    messageKey:
      'Inviter rebate tier percent must be an integer between 0 and 100',
  },
  {
    name: 'non-integer percent',
    value: '[{"min_invitees":0,"percent":1.5}]',
    messageKey:
      'Inviter rebate tier percent must be an integer between 0 and 100',
  },
  {
    name: 'negative min invitees',
    value: '[{"min_invitees":-1,"percent":10}]',
    messageKey:
      'Inviter rebate tier minimum invitees must be a non-negative integer',
  },
  {
    name: 'duplicate min invitees',
    value: '[{"min_invitees":6,"percent":10},{"min_invitees":6,"percent":15}]',
    messageKey:
      'Inviter rebate tiers must be ordered by strictly increasing minimum invitees',
  },
  {
    name: 'decreasing min invitees',
    value: '[{"min_invitees":6,"percent":10},{"min_invitees":5,"percent":15}]',
    messageKey:
      'Inviter rebate tiers must be ordered by strictly increasing minimum invitees',
  },
])('validation rejects $name', ({ value, messageKey }) => {
  expect(validateInviterRebateTiers(value)).toEqual({
    valid: false,
    messageKey,
  })
})

test(`validation rejects more than ${INVITER_REBATE_MAX_TIERS} tiers`, () => {
  const tooMany = JSON.stringify(
    Array.from({ length: INVITER_REBATE_MAX_TIERS + 1 }, (_, i) => ({
      min_invitees: i,
      percent: 1,
    }))
  )
  expect(validateInviterRebateTiers(tooMany)).toEqual({
    valid: false,
    messageKey: 'Inviter rebate tiers must contain at most {{count}} tiers',
    params: { count: INVITER_REBATE_MAX_TIERS },
  })
})

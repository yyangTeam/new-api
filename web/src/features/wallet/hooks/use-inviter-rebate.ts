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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  createServerError,
  requireServerSuccess,
} from '@/lib/server-error-message'

import { getInviterRebateInvitees, getInviterRebateSummary } from '../api'

export const inviterRebateWalletKeys = {
  user: (userId: number) => ['wallet', 'inviter-rebate', userId] as const,
  summary: (userId: number) =>
    [...inviterRebateWalletKeys.user(userId), 'summary'] as const,
  invitees: (userId: number, page: number, pageSize: number) =>
    [
      ...inviterRebateWalletKeys.user(userId),
      'invitees',
      page,
      pageSize,
    ] as const,
}

export function useInviterRebateSummary(userId: number) {
  const { t } = useTranslation()
  return useQuery({
    queryKey: inviterRebateWalletKeys.summary(userId),
    enabled: userId > 0,
    meta: { errorRedirect: false },
    queryFn: async () => {
      const response = requireServerSuccess(await getInviterRebateSummary())
      if (!response.data) {
        throw createServerError(response, t('Failed to load rebate summary'))
      }
      return response.data
    },
  })
}

export function useInviterRebateInvitees(
  userId: number,
  page: number,
  pageSize: number
) {
  const { t } = useTranslation()
  return useQuery({
    queryKey: inviterRebateWalletKeys.invitees(userId, page, pageSize),
    enabled: userId > 0,
    meta: { errorRedirect: false },
    queryFn: async () => {
      const response = requireServerSuccess(
        await getInviterRebateInvitees(page, pageSize)
      )
      if (!response.data) {
        throw createServerError(
          response,
          t('Failed to load invitee contributions')
        )
      }
      return response.data
    },
    // Keep pagination steady without ever borrowing another account's rows.
    placeholderData: (previous, query) =>
      query?.queryKey[2] === userId ? previous : undefined,
  })
}

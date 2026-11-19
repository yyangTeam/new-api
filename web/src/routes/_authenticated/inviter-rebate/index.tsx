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
import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'

import {
  DEFAULT_RANKING_METRIC,
  DEFAULT_RANKING_PERIOD,
  RANKING_METRIC_VALUES,
  RANKING_PERIOD_VALUES,
} from '@/features/inviter-rebate/constants'
import { InviterRebateRankings } from '@/features/inviter-rebate'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

const rankingsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  metric: z.enum(RANKING_METRIC_VALUES).optional().catch(DEFAULT_RANKING_METRIC),
  period: z
    .enum(RANKING_PERIOD_VALUES)
    .optional()
    .catch(DEFAULT_RANKING_PERIOD),
})

export const Route = createFileRoute('/_authenticated/inviter-rebate/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({
        to: '/403',
      })
    }
  },
  validateSearch: rankingsSearchSchema,
  component: InviterRebateRankings,
})

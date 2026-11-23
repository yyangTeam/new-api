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
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  DEFAULT_RANKING_METRIC,
  DEFAULT_RANKING_PERIOD,
  getRankingMetricOptions,
  getRankingPeriodOptions,
  type RankingMetric,
  type RankingPeriod,
} from '../constants'

const route = getRouteApi('/_authenticated/inviter-rebate/')

export function RankingsViewControls() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const metric = search.metric ?? DEFAULT_RANKING_METRIC
  const period = search.period ?? DEFAULT_RANKING_PERIOD

  // Switching the metric or period starts a fresh ranking, so reset the page.
  const updateSearch = (changes: {
    metric?: RankingMetric
    period?: RankingPeriod
  }) => {
    navigate({
      search: (prev) => ({ ...prev, ...changes, page: undefined }),
      replace: true,
    })
  }

  const metricOptions = getRankingMetricOptions(t)
  const periodOptions = getRankingPeriodOptions(t)

  return (
    <div className='flex items-center gap-2'>
      <Select
        value={metric}
        onValueChange={(value) =>
          updateSearch({ metric: value as RankingMetric })
        }
        items={metricOptions}
      >
        <SelectTrigger
          id='inviter-rebate-metric'
          className='h-8 w-[150px]'
          aria-label={t('Ranking Metric')}
        >
          <SelectValue placeholder={t('Rebate Amount')} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {metricOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(value) =>
          updateSearch({ period: value as RankingPeriod })
        }
        items={periodOptions}
      >
        <SelectTrigger
          id='inviter-rebate-period'
          className='h-8 w-[130px]'
          aria-label={t('Ranking Period')}
        >
          <SelectValue placeholder={t('This Month')} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

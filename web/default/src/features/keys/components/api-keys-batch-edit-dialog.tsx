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
import { useState, useCallback } from 'react'
import { type Table } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getUserModels, getUserGroups } from '@/lib/api'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { parseQuotaFromDollars } from '@/lib/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/datetime-picker'
import { MultiSelect } from '@/components/multi-select'
import { batchUpdateApiKeys } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { type ApiKey } from '../types'
import {
  ApiKeyGroupCombobox,
  type ApiKeyGroupOption,
} from './api-key-group-combobox'
import { useApiKeys } from './api-keys-provider'

type ApiKeysBatchEditDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function ApiKeysBatchEditDialog<TData>({
  open,
  onOpenChange,
  table,
}: ApiKeysBatchEditDialogProps<TData>) {
  const { t } = useTranslation()
  const { triggerRefresh } = useApiKeys()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [enableGroup, setEnableGroup] = useState(false)
  const [enableExpiredTime, setEnableExpiredTime] = useState(false)
  const [enableQuota, setEnableQuota] = useState(false)
  const [enableModelLimits, setEnableModelLimits] = useState(false)
  const [enableAllowIps, setEnableAllowIps] = useState(false)
  const [enableCrossGroupRetry, setEnableCrossGroupRetry] = useState(false)

  const [group, setGroup] = useState('')
  const [crossGroupRetry, setCrossGroupRetry] = useState(false)
  const [expiredTime, setExpiredTime] = useState<Date | undefined>(undefined)
  const [quotaDollars, setQuotaDollars] = useState(0)
  const [unlimitedQuota, setUnlimitedQuota] = useState(true)
  const [modelLimits, setModelLimits] = useState<string[]>([])
  const [allowIps, setAllowIps] = useState('')

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const { data: modelsData } = useQuery({
    queryKey: ['user-models'],
    queryFn: getUserModels,
    staleTime: 5 * 60 * 1000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['user-groups'],
    queryFn: getUserGroups,
    staleTime: 5 * 60 * 1000,
  })

  const models = modelsData?.data || []
  const groupsRaw = groupsData?.data || {}
  const groups: ApiKeyGroupOption[] = Object.entries(groupsRaw).map(
    ([key, info]) => ({
      value: key,
      label: key,
      desc: info.desc || key,
      ratio: info.ratio,
    })
  )

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'

  const resetForm = useCallback(() => {
    setEnableGroup(false)
    setEnableExpiredTime(false)
    setEnableQuota(false)
    setEnableModelLimits(false)
    setEnableAllowIps(false)
    setEnableCrossGroupRetry(false)
    setGroup('')
    setCrossGroupRetry(false)
    setExpiredTime(undefined)
    setQuotaDollars(0)
    setUnlimitedQuota(true)
    setModelLimits([])
    setAllowIps('')
  }, [])

  const handleOpenChange = useCallback(
    (v: boolean) => {
      onOpenChange(v)
      if (!v) resetForm()
    },
    [onOpenChange, resetForm]
  )

  const handleSubmit = async () => {
    const hasAnyField =
      enableGroup ||
      enableExpiredTime ||
      enableQuota ||
      enableModelLimits ||
      enableAllowIps ||
      enableCrossGroupRetry

    if (!hasAnyField) {
      toast.error(t('Please select at least one field to update'))
      return
    }

    setIsSubmitting(true)
    try {
      const ids = selectedRows.map((row) => (row.original as ApiKey).id)

      const payload: Record<string, unknown> = { ids }

      if (enableGroup) {
        payload.group = group
      }
      if (enableCrossGroupRetry) {
        payload.cross_group_retry = crossGroupRetry
      }
      if (enableExpiredTime) {
        payload.expired_time = expiredTime
          ? Math.floor(expiredTime.getTime() / 1000)
          : -1
      }
      if (enableQuota) {
        payload.unlimited_quota = unlimitedQuota
        payload.remain_quota = unlimitedQuota
          ? 0
          : parseQuotaFromDollars(quotaDollars || 0)
      }
      if (enableModelLimits) {
        payload.model_limits = modelLimits.join(',')
      }
      if (enableAllowIps) {
        payload.allow_ips = allowIps
      }

      const result = await batchUpdateApiKeys(
        payload as Parameters<typeof batchUpdateApiKeys>[0]
      )

      if (result.success) {
        const count = result.data || ids.length
        toast.success(t(SUCCESS_MESSAGES.API_KEYS_BATCH_UPDATED, { count }))
        table.resetRowSelection()
        triggerRefresh()
        handleOpenChange(false)
      } else {
        toast.error(result.message || t(ERROR_MESSAGES.BATCH_UPDATE_FAILED))
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsSubmitting(false)
    }
  }

  const quotaLabel = t('Quota ({{currency}})', { currency: currencyLabel })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {t('Batch Edit {{count}} API Key(s)', {
              count: selectedRows.length,
            })}
          </DialogTitle>
          <DialogDescription>
            {t('Only checked fields will be updated. Unchecked fields remain unchanged.')}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            {t(
              'Checked fields will overwrite the current values of all selected API keys.'
            )}
          </AlertDescription>
        </Alert>

        <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto py-2'>
          {/* Group */}
          <FieldRow
            label={t('Group')}
            checked={enableGroup}
            onCheckedChange={setEnableGroup}
          >
            <ApiKeyGroupCombobox
              options={groups}
              value={group}
              onValueChange={setGroup}
              placeholder={t('Select a group')}
              disabled={!enableGroup}
            />
          </FieldRow>

          {/* Cross-group retry */}
          <FieldRow
            label={t('Cross-group retry')}
            checked={enableCrossGroupRetry}
            onCheckedChange={setEnableCrossGroupRetry}
          >
            <Switch
              checked={crossGroupRetry}
              onCheckedChange={setCrossGroupRetry}
              disabled={!enableCrossGroupRetry}
            />
          </FieldRow>

          {/* Expiration Time */}
          <FieldRow
            label={t('Expiration Time')}
            checked={enableExpiredTime}
            onCheckedChange={setEnableExpiredTime}
          >
            <div className='flex flex-col gap-2'>
              <DateTimePicker
                value={expiredTime}
                onChange={setExpiredTime}
                placeholder={t('Never expires')}
                disabled={!enableExpiredTime}
              />
              {enableExpiredTime && (
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs'
                    onClick={() => setExpiredTime(undefined)}
                  >
                    {t('Never')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs'
                    onClick={() => {
                      const d = new Date()
                      d.setMonth(d.getMonth() + 1)
                      setExpiredTime(d)
                    }}
                  >
                    {t('1 Month')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs'
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 1)
                      setExpiredTime(d)
                    }}
                  >
                    {t('1 Day')}
                  </Button>
                </div>
              )}
            </div>
          </FieldRow>

          {/* Quota */}
          <FieldRow
            label={quotaLabel}
            checked={enableQuota}
            onCheckedChange={setEnableQuota}
          >
            <div className='flex flex-col gap-2'>
              {!unlimitedQuota && (
                <Input
                  type='number'
                  step={tokensOnly ? 1 : 0.01}
                  value={quotaDollars}
                  onChange={(e) =>
                    setQuotaDollars(parseFloat(e.target.value) || 0)
                  }
                  placeholder={
                    tokensOnly
                      ? t('Enter quota in tokens')
                      : t('Enter quota in {{currency}}', {
                          currency: currencyLabel,
                        })
                  }
                  disabled={!enableQuota}
                />
              )}
              <div className='flex items-center gap-2'>
                <Switch
                  checked={unlimitedQuota}
                  onCheckedChange={setUnlimitedQuota}
                  disabled={!enableQuota}
                />
                <Label className='text-sm'>{t('Unlimited Quota')}</Label>
              </div>
            </div>
          </FieldRow>

          {/* Model Limits */}
          <FieldRow
            label={t('Model Limits')}
            checked={enableModelLimits}
            onCheckedChange={setEnableModelLimits}
          >
            <MultiSelect
              options={models.map((m) => ({ label: m, value: m }))}
              selected={modelLimits}
              onChange={setModelLimits}
              placeholder={t('Select models (empty for allow all)')}
              disabled={!enableModelLimits}
            />
          </FieldRow>

          {/* IP Whitelist */}
          <FieldRow
            label={t('IP Whitelist (supports CIDR)')}
            checked={enableAllowIps}
            onCheckedChange={setEnableAllowIps}
          >
            <Textarea
              value={allowIps}
              onChange={(e) => setAllowIps(e.target.value)}
              className='min-h-16 resize-none'
              placeholder={t('One IP per line (empty for no restriction)')}
              rows={2}
              disabled={!enableAllowIps}
            />
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                {t('Saving...')}
              </>
            ) : (
              t('Save changes')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldRow({
  label,
  checked,
  onCheckedChange,
  children,
}: {
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-2 rounded-md border p-3'>
      <div className='flex items-center gap-2'>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        <Label
          className='cursor-pointer text-sm font-medium'
          onClick={() => onCheckedChange(!checked)}
        >
          {label}
        </Label>
      </div>
      <div className={checked ? '' : 'pointer-events-none opacity-40'}>
        {children}
      </div>
    </div>
  )
}

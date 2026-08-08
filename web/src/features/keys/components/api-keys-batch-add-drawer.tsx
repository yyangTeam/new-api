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
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, KeyRound, Settings2, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { DateTimePicker } from '@/components/datetime-picker'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { MultiSelect } from '@/components/multi-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useStatus } from '@/hooks/use-status'
import { getUserModels, getUserGroups } from '@/lib/api'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { parseQuotaFromDollars } from '@/lib/format'
import { cn } from '@/lib/utils'

import { batchCreateApiKeys } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import type { BatchCreateApiKeysResponse } from '../types'
import {
  ApiKeyGroupCombobox,
  type ApiKeyGroupOption,
} from './api-key-group-combobox'
import { useApiKeys } from './api-keys-provider'

const MAX_BATCH_TOKEN_COUNT = 50
const MAX_TOKEN_NAME_LENGTH = 50

function parseTokenNames(input: string): { names: string[]; error: string } {
  const trimmed = input.trim()
  if (!trimmed) return { names: [], error: 'Please enter token name list' }

  const comma = /[,，]/
  const semicolon = /[;；]/
  const detectionText = trimmed.replace(/\s*([,，;；])\s*/g, '$1')
  const whitespace = /\s+/

  const delimiterTypes: string[] = []
  if (comma.test(trimmed)) delimiterTypes.push('comma')
  if (semicolon.test(trimmed)) delimiterTypes.push('semicolon')
  if (whitespace.test(detectionText)) delimiterTypes.push('whitespace')

  if (delimiterTypes.length > 1)
    return { names: [], error: 'Please use only one delimiter' }

  let parts: string[]
  switch (delimiterTypes[0]) {
    case 'comma':
      parts = trimmed.split(/[,，]/)
      break
    case 'semicolon':
      parts = trimmed.split(/[;；]/)
      break
    case 'whitespace':
      parts = trimmed.split(/\s+/)
      break
    default:
      parts = [trimmed]
      break
  }

  const names = parts.map((n) => n.trim())

  if (names.some((n) => n === ''))
    return { names: [], error: 'Token name cannot be empty' }
  if (names.length > MAX_BATCH_TOKEN_COUNT)
    return { names: [], error: 'Token count must be 1-50' }
  if (names.some((n) => [...n].length > MAX_TOKEN_NAME_LENGTH))
    return { names: [], error: 'Token name cannot exceed 50 characters' }

  const seen = new Set<string>()
  for (const name of names) {
    if (seen.has(name))
      return { names: [], error: 'Duplicate names exist in this batch' }
    seen.add(name)
  }

  return { names, error: '' }
}

type BatchAddFormValues = z.infer<ReturnType<typeof getBatchAddFormSchema>>

function getBatchAddFormSchema(t: (key: string) => string) {
  return z
    .object({
      names_text: z.string().min(1, t('Please enter token name list')),
      group: z.string().optional(),
      cross_group_retry: z.boolean(),
      expired_time: z.date().optional(),
      remain_quota_dollars: z.number().optional(),
      unlimited_quota: z.boolean(),
      model_limits: z.array(z.string()),
      allow_ips: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.unlimited_quota) {
        if (
          data.remain_quota_dollars === undefined ||
          data.remain_quota_dollars < 0
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['remain_quota_dollars'],
            message: t('Quota must be zero or greater'),
          })
        }
      }
    })
}

type ApiKeysBatchAddDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeysBatchAddDrawer({
  open,
  onOpenChange,
}: ApiKeysBatchAddDrawerProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useApiKeys()
  const { status } = useStatus()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [batchResult, setBatchResult] =
    useState<BatchCreateApiKeysResponse | null>(null)

  const defaultUseAutoGroup = status?.default_use_auto_group === true

  const { data: modelsData } = useQuery({
    queryKey: ['user-models'],
    queryFn: getUserModels,
    enabled: open,
    staleTime: 0,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['user-groups'],
    queryFn: getUserGroups,
    enabled: open,
    staleTime: 0,
  })

  const models = modelsData?.data || []
  const groups = useMemo<ApiKeyGroupOption[]>(
    () =>
      Object.entries(groupsData?.data || {}).map(([key, info]) => ({
        value: key,
        label: key,
        desc: info.desc || key,
        ratio: info.ratio,
      })),
    [groupsData]
  )

  const schema = useMemo(() => getBatchAddFormSchema(t), [t])

  const form = useForm<BatchAddFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      names_text: '',
      group: defaultUseAutoGroup ? 'auto' : '',
      cross_group_retry: defaultUseAutoGroup,
      expired_time: undefined,
      remain_quota_dollars: 10,
      unlimited_quota: true,
      model_limits: [],
      allow_ips: '',
    },
  })

  const namesText = form.watch('names_text')
  const parsedNames = useMemo(() => parseTokenNames(namesText), [namesText])
  const selectedGroup = form.watch('group')
  const unlimitedQuota = form.watch('unlimited_quota')

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'

  const handleSetExpiry = (months: number, days: number, hours: number) => {
    if (months === 0 && days === 0 && hours === 0) {
      form.setValue('expired_time', undefined)
      return
    }
    const now = new Date()
    now.setMonth(now.getMonth() + months)
    now.setDate(now.getDate() + days)
    now.setHours(now.getHours() + hours)
    form.setValue('expired_time', now)
  }

  const onSubmit = async (data: BatchAddFormValues) => {
    const parsed = parseTokenNames(data.names_text)
    if (parsed.error) {
      toast.error(t(parsed.error))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await batchCreateApiKeys({
        names: parsed.names,
        expired_time: data.expired_time
          ? Math.floor(data.expired_time.getTime() / 1000)
          : -1,
        remain_quota: data.unlimited_quota
          ? 0
          : parseQuotaFromDollars(data.remain_quota_dollars || 0),
        unlimited_quota: data.unlimited_quota,
        model_limits_enabled: data.model_limits.length > 0,
        model_limits: data.model_limits.join(','),
        allow_ips: data.allow_ips || '',
        group: data.group || '',
        cross_group_retry:
          data.group === 'auto' ? !!data.cross_group_retry : false,
      })

      if (!result.success) {
        toast.error(result.message || t(ERROR_MESSAGES.BATCH_CREATE_FAILED))
        return
      }

      const responseData = result.data!
      if (responseData.failed === 0) {
        toast.success(
          t(SUCCESS_MESSAGES.API_KEYS_BATCH_CREATED, {
            count: responseData.created,
          })
        )
        onOpenChange(false)
        form.reset()
        triggerRefresh()
      } else {
        if (responseData.created > 0) {
          toast.success(
            t(SUCCESS_MESSAGES.API_KEYS_BATCH_PARTIAL, {
              count: responseData.created,
            })
          )
        }
        setBatchResult(responseData)
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
  }

  const handleResultDismiss = () => {
    setBatchResult(null)
    onOpenChange(false)
    form.reset()
    triggerRefresh()
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose()
        }}
      >
        <SheetContent
          className={sideDrawerContentClassName(
            'max-w-none sm:!max-w-[620px]'
          )}
        >
          <SheetHeader className={sideDrawerHeaderClassName()}>
            <SheetTitle>{t('Batch Add Tokens')}</SheetTitle>
            <SheetDescription>
              {t(
                'Create multiple API keys by entering a list of names with shared configuration.'
              )}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              id='batch-add-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className={sideDrawerFormClassName('gap-5')}
            >
              {/* Token Names Section */}
              <SideDrawerSection>
                <SideDrawerSectionHeader
                  title={t('Token Names')}
                  description={t(
                    'Enter token names separated by a single delimiter type'
                  )}
                  icon={<KeyRound className='size-4' />}
                  iconTone='info'
                />

                <FormField
                  control={form.control}
                  name='names_text'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Token Name List')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t(
                            'Example: token-a, token-b, token-c'
                          )}
                          rows={4}
                          className='resize-none'
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Supports one delimiter type per batch: comma (English or Chinese), semicolon (English or Chinese), or whitespace (spaces, new lines, tabs).'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert variant={parsedNames.error ? 'destructive' : 'default'}>
                  <AlertDescription>
                    {parsedNames.error
                      ? t(parsedNames.error)
                      : namesText.trim()
                        ? t(
                            'Will create {{count}} tokens. Full keys will not be shown in the creation result.',
                            { count: parsedNames.names.length }
                          )
                        : t('Please enter token name list')}
                  </AlertDescription>
                </Alert>
              </SideDrawerSection>

              {/* Basic Information Section */}
              <SideDrawerSection>
                <SideDrawerSectionHeader
                  title={t('Basic Information')}
                  description={t('Group and expiration settings')}
                  icon={<Settings2 className='size-4' />}
                  iconTone='chart-3'
                />

                <FormField
                  control={form.control}
                  name='group'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Group')}</FormLabel>
                      <FormControl>
                        <ApiKeyGroupCombobox
                          options={groups}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          placeholder={t('Select a group')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedGroup === 'auto' && (
                  <FormField
                    control={form.control}
                    name='cross_group_retry'
                    render={({ field }) => (
                      <div className={sideDrawerSwitchItemClassName()}>
                        <FormItem className='flex-1'>
                          <FormLabel>{t('Cross-group retry')}</FormLabel>
                          <FormDescription>
                            {t(
                              'When enabled, if the current group channel fails, the next group channel will be tried in order'
                            )}
                          </FormDescription>
                        </FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name='expired_time'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Expiration Time')}</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('Never expires')}
                        />
                      </FormControl>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='text-xs'
                          onClick={() => handleSetExpiry(0, 0, 0)}
                        >
                          {t('Never')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='text-xs'
                          onClick={() => handleSetExpiry(1, 0, 0)}
                        >
                          {t('1 Month')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='text-xs'
                          onClick={() => handleSetExpiry(0, 1, 0)}
                        >
                          {t('1 Day')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='text-xs'
                          onClick={() => handleSetExpiry(0, 0, 1)}
                        >
                          {t('1 Hour')}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SideDrawerSection>

              {/* Quota Settings Section */}
              <SideDrawerSection>
                <SideDrawerSectionHeader
                  title={t('Quota Settings')}
                  description={t('Set token available quota')}
                  icon={<WalletCards className='size-4' />}
                  iconTone='success'
                />

                {!unlimitedQuota && (
                  <FormField
                    control={form.control}
                    name='remain_quota_dollars'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('Quota ({{currency}})', {
                            currency: currencyLabel,
                          })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step={tokensOnly ? 1 : 0.01}
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                            placeholder={
                              tokensOnly
                                ? t('Enter quota in tokens')
                                : t('Enter quota in {{currency}}', {
                                    currency: currencyLabel,
                                  })
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name='unlimited_quota'
                  render={({ field }) => (
                    <div className={sideDrawerSwitchItemClassName()}>
                      <FormItem className='flex-1'>
                        <FormLabel>{t('Unlimited Quota')}</FormLabel>
                        <FormDescription>
                          {t(
                            'Token quota only limits the token itself. Actual usage is also limited by the account balance.'
                          )}
                        </FormDescription>
                      </FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  )}
                />
              </SideDrawerSection>

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger
                  render={
                    <button
                      type='button'
                      className='text-muted-foreground hover:bg-muted/40 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors'
                    />
                  }
                >
                  {t('Advanced Settings')}
                  <ChevronDown
                    className={cn(
                      'size-4 transition-transform',
                      advancedOpen && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-3 flex flex-col gap-4'>
                  <FormField
                    control={form.control}
                    name='model_limits'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Model Limits')}</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={models.map((m) => ({
                              label: m,
                              value: m,
                            }))}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder={t(
                              'Select models (empty for allow all)'
                            )}
                          />
                        </FormControl>
                        <FormDescription>
                          {t(
                            'Optional. Model limits are not recommended unless needed.'
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='allow_ips'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('IP Whitelist (supports CIDR)')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t(
                              'One IP per line (empty for no restriction)'
                            )}
                            rows={2}
                            className='min-h-16 resize-none'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </form>
          </Form>

          <SheetFooter className={sideDrawerFooterClassName()}>
            <SheetClose
              render={
                <Button variant='outline' className='w-full sm:w-auto' />
              }
            >
              {t('Close')}
            </SheetClose>
            <Button
              type='button'
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || !!parsedNames.error}
              className='w-full sm:w-auto'
            >
              {isSubmitting ? t('Saving...') : t('Save changes')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!batchResult} onOpenChange={(v) => !v && handleResultDismiss()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('Batch add tokens partially failed')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('The following tokens failed to create:')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='max-h-[180px] overflow-y-auto text-sm'>
            {batchResult?.errors.map((err, i) => (
              <div key={i} className='text-muted-foreground py-0.5'>
                <span className='font-medium text-foreground'>
                  {err.name}
                </span>
                : {err.reason}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>{t('Confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

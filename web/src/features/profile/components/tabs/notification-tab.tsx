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
import { Bell, Bot, Loader2, Mail, MessageSquare, Server, Webhook } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE } from '@/lib/roles'

import { updateUserSettings } from '../../api'
import {
  DEFAULT_QUOTA_WARNING_THRESHOLD,
  NOTIFICATION_METHODS,
  ADMIN_NOTIFICATION_METHODS,
} from '../../constants'
import { parseUserSettings } from '../../lib'
import type { UserProfile, UserSettings, NotifyType } from '../../types'

const NOTIFICATION_ICONS: Record<NotifyType, typeof Mail> = {
  email: Mail,
  webhook: Webhook,
  bark: Bell,
  gotify: Server,
  feishu: MessageSquare,
  qqbot: Bot,
}

const ALL_METHODS = [...NOTIFICATION_METHODS, ...ADMIN_NOTIFICATION_METHODS]

const ALL_VALUES = new Set<NotifyType>(ALL_METHODS.map((m) => m.value))

function normalizeNotifyType(value: unknown): NotifyType {
  return typeof value === 'string' && ALL_VALUES.has(value as NotifyType)
    ? (value as NotifyType)
    : 'email'
}

// ============================================================================
// Settings Tab Component
// ============================================================================

interface NotificationTabProps {
  profile: UserProfile | null
  onUpdate: () => void
}

export function NotificationTab({ profile, onUpdate }: NotificationTabProps) {
  const { t } = useTranslation()
  const isAdmin = (profile?.role ?? 0) >= ROLE.ADMIN
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    notify_type: 'email',
    quota_warning_threshold: DEFAULT_QUOTA_WARNING_THRESHOLD,
    notify_cooldown_minutes: 0,
    notification_email: '',
    webhook_url: '',
    webhook_secret: '',
    bark_url: '',
    gotify_url: '',
    gotify_token: '',
    gotify_priority: 5,
    feishu_webhook_url: '',
    feishu_webhook_secret: '',
    qqbot_app_id: '',
    qqbot_app_secret: '',
    qqbot_target_type: 'group',
    qqbot_target_id: '',
    accept_unset_model_ratio_model: false,
    record_ip_log: false,
    upstream_model_update_notify_enabled: false,
  })

  // Update form field helper
  const updateField = useCallback(
    <K extends keyof UserSettings>(field: K, value: UserSettings[K]) => {
      setSettings((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  useEffect(() => {
    if (profile?.setting) {
      const parsed = parseUserSettings(profile.setting)
      setSettings({
        notify_type: normalizeNotifyType(parsed.notify_type),
        quota_warning_threshold:
          parsed.quota_warning_threshold ?? DEFAULT_QUOTA_WARNING_THRESHOLD,
        notify_cooldown_minutes: parsed.notify_cooldown_minutes ?? 0,
        notification_email: parsed.notification_email ?? '',
        webhook_url: parsed.webhook_url ?? '',
        webhook_secret: parsed.webhook_secret ?? '',
        bark_url: parsed.bark_url ?? '',
        gotify_url: parsed.gotify_url ?? '',
        gotify_token: parsed.gotify_token ?? '',
        gotify_priority: parsed.gotify_priority ?? 5,
        feishu_webhook_url: parsed.feishu_webhook_url ?? '',
        feishu_webhook_secret: parsed.feishu_webhook_secret ?? '',
        qqbot_app_id: parsed.qqbot_app_id ?? '',
        qqbot_app_secret: parsed.qqbot_app_secret ?? '',
        qqbot_target_type: parsed.qqbot_target_type || 'group',
        qqbot_target_id: parsed.qqbot_target_id ?? '',
        accept_unset_model_ratio_model:
          parsed.accept_unset_model_ratio_model || false,
        record_ip_log: parsed.record_ip_log || false,
        upstream_model_update_notify_enabled:
          parsed.upstream_model_update_notify_enabled || false,
      })
    }
  }, [profile])

  const handleSave = async () => {
    try {
      setLoading(true)
      const response = await updateUserSettings(settings)

      if (response.success) {
        toast.success(t('Settings updated successfully'))
        onUpdate()
      } else {
        toast.error(response.message || t('Failed to update settings'))
      }
    } catch (_error) {
      toast.error(t('Failed to update settings'))
    } finally {
      setLoading(false)
    }
  }

  const notifyType = normalizeNotifyType(settings.notify_type)

  const visibleMethods = useMemo(() => {
    if (isAdmin) return ALL_METHODS
    return [...NOTIFICATION_METHODS]
  }, [isAdmin])

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* Notification Type */}
      <div className='space-y-2.5'>
        <Label>{t('Notification Method')}</Label>
        <ToggleGroup
          value={[notifyType]}
          onValueChange={(value) => {
            const nextValue = value.find((item) => item !== notifyType)
            if (nextValue)
              updateField('notify_type', normalizeNotifyType(nextValue))
          }}
          aria-label={t('Notification Method')}
          variant='outline'
          size='lg'
          spacing={2}
          className='grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3'
        >
          {visibleMethods.map((method) => {
            const Icon = NOTIFICATION_ICONS[method.value]
            return (
              <ToggleGroupItem
                key={method.value}
                value={method.value}
                className='h-auto min-h-14 w-full flex-col gap-1.5 px-3 py-3 sm:min-h-16'
              >
                <Icon className='h-4 w-4 sm:h-5 sm:w-5' />
                <span className='max-w-full truncate text-xs font-medium sm:text-sm'>
                  {t(method.label)}
                </span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      {/* Warning Threshold */}
      <div className='space-y-1.5'>
        <Label htmlFor='threshold'>{t('Quota Warning Threshold')}</Label>
        <Input
          id='threshold'
          type='number'
          className='h-9'
          value={settings.quota_warning_threshold}
          onChange={(e) =>
            updateField('quota_warning_threshold', Number(e.target.value))
          }
          placeholder={t('Enter threshold')}
        />
        <p className='text-muted-foreground text-xs'>
          {t('Get notified when balance falls below this value')}
        </p>
      </div>

      {/* Notification Cooldown */}
      <div className='space-y-1.5'>
        <Label htmlFor='cooldown'>{t('Notification Cooldown (minutes)')}</Label>
        <Input
          id='cooldown'
          type='number'
          className='h-9'
          min={0}
          max={43200}
          value={settings.notify_cooldown_minutes}
          onChange={(e) =>
            updateField('notify_cooldown_minutes', Number(e.target.value))
          }
          placeholder='0'
        />
        <p className='text-muted-foreground text-xs'>
          {t('Minimum interval between notifications. Set to 0 to use server default (approx. every 10 minutes).')}
        </p>
      </div>

      {/* Email Settings */}
      {notifyType === 'email' && (
        <div className='space-y-1.5'>
          <Label htmlFor='notifyEmail'>{t('Notification Email')}</Label>
          <Input
            id='notifyEmail'
            type='email'
            className='h-9'
            value={settings.notification_email}
            onChange={(e) => updateField('notification_email', e.target.value)}
            placeholder={t('Leave empty to use account email')}
          />
        </div>
      )}

      {/* Webhook Settings */}
      {notifyType === 'webhook' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='webhookUrl'>{t('Webhook URL')}</Label>
            <Input
              id='webhookUrl'
              type='url'
              className='h-9'
              value={settings.webhook_url}
              onChange={(e) => updateField('webhook_url', e.target.value)}
              placeholder={t('https://example.com/webhook')}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='webhookSecret'>{t('Webhook Secret')}</Label>
            <PasswordInput
              id='webhookSecret'
              value={settings.webhook_secret}
              onChange={(e) => updateField('webhook_secret', e.target.value)}
              placeholder={t('Enter secret key')}
            />
          </div>
        </>
      )}

      {/* Bark Settings */}
      {notifyType === 'bark' && (
        <div className='space-y-1.5'>
          <Label htmlFor='barkUrl'>{t('Bark Push URL')}</Label>
          <Input
            id='barkUrl'
            type='url'
            className='h-9'
            value={settings.bark_url}
            onChange={(e) => updateField('bark_url', e.target.value)}
            placeholder={t('https://api.day.app/yourkey/{{title}}/{{content}}')}
          />
          <p className='text-muted-foreground text-xs'>
            {t('Template variables:')} {'{{title}}'}, {'{{content}}'}
          </p>
        </div>
      )}

      {/* Gotify Settings */}
      {notifyType === 'gotify' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyUrl'>{t('Gotify Server URL')}</Label>
            <Input
              id='gotifyUrl'
              type='url'
              className='h-9'
              value={settings.gotify_url}
              onChange={(e) => updateField('gotify_url', e.target.value)}
              placeholder={t('https://gotify.example.com')}
            />
            <p className='text-muted-foreground text-xs'>
              {t('Enter the full URL of your Gotify server')}
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyToken'>{t('Gotify Application Token')}</Label>
            <PasswordInput
              id='gotifyToken'
              value={settings.gotify_token}
              onChange={(e) => updateField('gotify_token', e.target.value)}
              placeholder={t('Enter application token')}
            />
            <p className='text-muted-foreground text-xs'>
              {t('Token obtained from your Gotify application')}
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='gotifyPriority'>{t('Message Priority')}</Label>
            <Input
              id='gotifyPriority'
              type='number'
              className='h-9'
              min='0'
              max='10'
              value={settings.gotify_priority}
              onChange={(e) =>
                updateField('gotify_priority', Number(e.target.value))
              }
              placeholder='5'
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'Priority level from 0 (lowest) to 10 (highest), default is 5'
              )}
            </p>
          </div>
          <div className='bg-muted/50 rounded-lg border p-3 sm:p-4'>
            <h5 className='mb-1.5 text-sm font-medium sm:mb-2'>
              {t('Setup Instructions')}
            </h5>
            <ol className='text-muted-foreground space-y-1 text-xs'>
              <li>{t('1. Create an application in your Gotify server')}</li>
              <li>{t('2. Copy the application token')}</li>
              <li>{t('3. Enter your Gotify server URL and token above')}</li>
            </ol>
            <p className='text-muted-foreground mt-3 text-xs'>
              {t('Learn more:')}{' '}
              <a
                href='https://gotify.net/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline underline-offset-4'
              >
                {t('Gotify Documentation')}
              </a>
            </p>
          </div>
        </>
      )}

      {/* Feishu Settings */}
      {notifyType === 'feishu' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='feishuUrl'>{t('Feishu Webhook URL')}</Label>
            <Input
              id='feishuUrl'
              type='url'
              className='h-9'
              value={settings.feishu_webhook_url}
              onChange={(e) => updateField('feishu_webhook_url', e.target.value)}
              placeholder='https://open.feishu.cn/open-apis/bot/v2/hook/...'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='feishuSecret'>{t('Feishu Webhook Secret')}</Label>
            <PasswordInput
              id='feishuSecret'
              value={settings.feishu_webhook_secret}
              onChange={(e) =>
                updateField('feishu_webhook_secret', e.target.value)
              }
              placeholder={t('Enter secret key')}
            />
            <p className='text-muted-foreground text-xs'>
              {t('Optional. Used for webhook signature verification.')}
            </p>
          </div>
        </>
      )}

      {/* QQ Bot Settings */}
      {notifyType === 'qqbot' && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='qqbotAppId'>{t('QQ Bot AppID')}</Label>
            <Input
              id='qqbotAppId'
              className='h-9'
              value={settings.qqbot_app_id}
              onChange={(e) => updateField('qqbot_app_id', e.target.value)}
              placeholder={t('Enter AppID from QQ Open Platform')}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='qqbotAppSecret'>{t('QQ Bot AppSecret')}</Label>
            <PasswordInput
              id='qqbotAppSecret'
              value={settings.qqbot_app_secret}
              onChange={(e) =>
                updateField('qqbot_app_secret', e.target.value)
              }
              placeholder={t('Enter AppSecret from QQ Open Platform')}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='qqbotTargetType'>{t('Message Target Type')}</Label>
            <Select
              value={settings.qqbot_target_type || 'group'}
              onValueChange={(value) => updateField('qqbot_target_type', value ?? undefined)}
            >
              <SelectTrigger className='h-9'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='private'>
                  {t('Private Message')}
                </SelectItem>
                <SelectItem value='group'>{t('Group Message')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='qqbotTargetId'>{t('Target OpenID')}</Label>
            <Input
              id='qqbotTargetId'
              className='h-9'
              value={settings.qqbot_target_id}
              onChange={(e) => updateField('qqbot_target_id', e.target.value)}
              placeholder={
                settings.qqbot_target_type === 'group'
                  ? t('Enter group_openid')
                  : t('Enter user_openid')
              }
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'OpenID can be obtained from QQ Bot webhook event callbacks.'
              )}
            </p>
          </div>
        </>
      )}

      {/* Divider */}
      <div className='border-t' />

      {/* Preferences Section */}
      <div className='space-y-3'>
        <div>
          <h4 className='text-sm font-medium'>{t('Preferences')}</h4>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Configure your account behavior preferences')}
          </p>
        </div>

        {/* Receive Upstream Model Update Notifications (admin only) */}
        {isAdmin && (
          <div className='flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4'>
            <div className='space-y-0.5'>
              <Label htmlFor='upstreamModelUpdateNotify'>
                {t('Receive Upstream Model Update Notifications')}
              </Label>
              <p className='text-muted-foreground line-clamp-3 text-xs sm:line-clamp-none sm:text-sm'>
                {t(
                  'Only available for admins. When enabled, you will receive a summary notification via your selected method when the scheduled model check detects upstream model changes or check failures.'
                )}
              </p>
            </div>
            <Switch
              id='upstreamModelUpdateNotify'
              className='shrink-0'
              checked={settings.upstream_model_update_notify_enabled}
              onCheckedChange={(checked) =>
                updateField('upstream_model_update_notify_enabled', checked)
              }
            />
          </div>
        )}

        {/* Accept Unset Model Price */}
        <div className='flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='acceptUnsetPrice'>
              {t('Accept Unpriced Models')}
            </Label>
            <p className='text-muted-foreground text-xs sm:text-sm'>
              {t('Allow using models without price configuration')}
            </p>
          </div>
          <Switch
            id='acceptUnsetPrice'
            className='shrink-0'
            checked={settings.accept_unset_model_ratio_model}
            onCheckedChange={(checked) =>
              updateField('accept_unset_model_ratio_model', checked)
            }
          />
        </div>

        {/* Record IP Log */}
        <div className='flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4'>
          <div className='space-y-0.5'>
            <Label htmlFor='recordIp'>{t('Record IP Address')}</Label>
            <p className='text-muted-foreground text-xs sm:text-sm'>
              {t('Log IP address for usage and error logs')}
            </p>
          </div>
          <Switch
            id='recordIp'
            className='shrink-0'
            checked={settings.record_ip_log}
            onCheckedChange={(checked) => updateField('record_ip_log', checked)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className='flex justify-end'>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {loading ? t('Saving...') : t('Save Settings')}
        </Button>
      </div>
    </div>
  )
}

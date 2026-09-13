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

You should have received the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  HistoryIcon,
  PowerIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { SystemUpdateAction } from '@/features/system-update/system-update-action'
import { useStatus } from '@/hooks/use-status'
import { api } from '@/lib/api'
import { formatTimestamp, formatTimestampToDate } from '@/lib/format'

import { SettingsSection } from '../components/settings-section'

type RollbackVersion = {
  version: string
  name?: string
  published_at?: string
  html_url?: string
}

type UpdateCheckerSectionProps = {
  currentVersion?: string | null
  startTime?: number | null
}

export function UpdateCheckerSection(props: UpdateCheckerSectionProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const uptime = props.startTime
    ? formatTimestamp(props.startTime)
    : t('Unknown')
  const version = status?.version || props.currentVersion || t('Unknown')

  const [rollbackVersions, setRollbackVersions] = useState<RollbackVersion[]>(
    []
  )
  const [backupExists, setBackupExists] = useState(false)
  const [loadingRollback, setLoadingRollback] = useState(false)
  const [rollingBack, setRollingBack] = useState<Record<string, boolean>>({})
  const [restarting, setRestarting] = useState(false)

  const fetchRollbackInfo = async () => {
    setLoadingRollback(true)
    try {
      const response = await api.get('/api/system/rollback/versions')
      const payload = response.data
      if (!payload?.success) {
        throw new Error(payload?.message || t('Failed to load rollback info'))
      }
      const data = payload.data
      setRollbackVersions(data?.versions ?? [])
      setBackupExists(Boolean(data?.backup_exists))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Failed to load rollback info')
      toast.error(message)
    } finally {
      setLoadingRollback(false)
    }
  }

  useEffect(() => {
    fetchRollbackInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRestart = async () => {
    setRestarting(true)
    try {
      const response = await api.post('/api/system/restart')
      const payload = response.data
      if (!payload?.success) {
        throw new Error(payload?.message || t('Restart failed'))
      }
      toast.success(t('Service is restarting...'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Restart failed')
      toast.error(message)
    } finally {
      setRestarting(false)
    }
  }

  const handleRollbackBackup = async () => {
    setRollingBack((prev) => ({ ...prev, __backup__: true }))
    try {
      const response = await api.post('/api/system/rollback')
      const payload = response.data
      if (!payload?.success) {
        throw new Error(payload?.message || t('Rollback failed'))
      }
      toast.success(
        t('Rolled back to previous version. Service is restarting...')
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Rollback failed')
      toast.error(message)
    } finally {
      setRollingBack((prev) => ({ ...prev, __backup__: false }))
    }
  }

  const handleRollbackToVersion = async (version: string) => {
    setRollingBack((prev) => ({ ...prev, [version]: true }))
    try {
      const response = await api.post('/api/system/rollback/version', {
        version,
      })
      const payload = response.data
      if (!payload?.success) {
        throw new Error(payload?.message || t('Rollback failed'))
      }
      toast.success(
        t('Rolled back to {{version}}. Service is restarting...', {
          version,
        })
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Rollback failed')
      toast.error(message)
    } finally {
      setRollingBack((prev) => ({ ...prev, [version]: false }))
    }
  }

  return (
    <>
      <SettingsSection title={t('System maintenance')}>
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-sm'>
                {t('Current version')}
              </div>
              <div className='text-lg font-semibold break-all'>{version}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-sm'>
                {t('Uptime since')}
              </div>
              <div className='text-lg font-semibold'>{uptime}</div>
            </div>
          </div>

          <div className='flex flex-wrap gap-3'>
            <SystemUpdateAction compact={false} />

            <Button
              variant='outline'
              onClick={handleRestart}
              disabled={restarting}
            >
              {restarting ? (
                t('Restarting...')
              ) : (
                <>
                  <PowerIcon className='me-2 h-4 w-4' />
                  {t('Restart service')}
                </>
              )}
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={fetchRollbackInfo}
              disabled={loadingRollback}
            >
              <RefreshCcwIcon className='me-2 h-4 w-4' />
              {t('Refresh')}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('Version rollback')}>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              variant='outline'
              onClick={handleRollbackBackup}
              disabled={!backupExists || rollingBack.__backup__}
              title={
                backupExists
                  ? t('Restore the binary backed up before the last update')
                  : t('No previous version backup is available')
              }
            >
              {rollingBack.__backup__ ? (
                t('Rolling back...')
              ) : (
                <>
                  <RotateCcwIcon className='me-2 h-4 w-4' />
                  {t('Restore previous version')}
                </>
              )}
            </Button>
            <span className='text-muted-foreground text-sm'>
              {backupExists
                ? t(
                    'Instantly revert to the binary kept as backup after the last update.'
                  )
                : t(
                    'No local backup yet. Pick a version below to download and roll back.'
                  )}
            </span>
          </div>

          <div className='space-y-2'>
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <HistoryIcon className='h-4 w-4' />
              {t('Recent versions you can roll back to')}
            </div>

            {loadingRollback && rollbackVersions.length === 0 ? (
              <div className='text-muted-foreground text-sm'>
                {t('Loading...')}
              </div>
            ) : rollbackVersions.length === 0 ? (
              <div className='text-muted-foreground text-sm'>
                {t('No earlier versions are available for rollback.')}
              </div>
            ) : (
              <div className='space-y-2'>
                {rollbackVersions.map((item) => (
                  <div
                    key={item.version}
                    className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'
                  >
                    <div className='min-w-0'>
                      <div className='font-medium'>{item.version}</div>
                      <div className='text-muted-foreground text-xs'>
                        {item.published_at
                          ? formatTimestampToDate(
                              new Date(item.published_at).getTime(),
                              'milliseconds'
                            )
                          : ''}
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleRollbackToVersion(item.version)}
                      disabled={Boolean(rollingBack[item.version])}
                    >
                      {rollingBack[item.version] ? (
                        t('Rolling back...')
                      ) : (
                        <>
                          <RotateCcwIcon className='me-2 h-4 w-4' />
                          {t('Roll back')}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SettingsSection>
    </>
  )
}

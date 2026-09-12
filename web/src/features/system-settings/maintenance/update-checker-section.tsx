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
import {
  DownloadIcon,
  ExternalLinkIcon,
  HistoryIcon,
  PowerIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { api } from '@/lib/api'
import { formatTimestamp, formatTimestampToDate } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'

import { SettingsSection } from '../components/settings-section'

type ReleaseInfo = {
  tag_name: string
  name?: string
  body?: string
  html_url?: string
  published_at?: string
}

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

export function UpdateCheckerSection({
  currentVersion,
  startTime,
}: UpdateCheckerSectionProps) {
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [release, setRelease] = useState<ReleaseInfo | null>(null)

  const [rollbackVersions, setRollbackVersions] = useState<RollbackVersion[]>(
    []
  )
  const [backupExists, setBackupExists] = useState(false)
  const [loadingRollback, setLoadingRollback] = useState(false)
  const [rollingBack, setRollingBack] = useState<
    Record<string, boolean>
  >({})

  const uptime = startTime ? formatTimestamp(startTime) : t('Unknown')
  const version = currentVersion || t('Unknown')

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

  const handleCheckUpdates = async () => {
    setChecking(true)
    try {
      const response = await api.get('/api/latest-release')
      const payload = response.data
      if (!payload?.success) {
        throw new Error(
          payload?.message || t('Failed to contact GitHub releases API')
        )
      }

      const data = payload.data as ReleaseInfo
      if (!data?.tag_name) {
        throw new Error(t('Unexpected release payload'))
      }

      if (currentVersion && data.tag_name === currentVersion) {
        toast.success(
          t('You are running the latest version ({{version}}).', {
            version: data.tag_name,
          })
        )
        return
      }

      setRelease(data)
      setDialogOpen(true)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('Failed to check for updates')
      handleServerError(error, message)
    } finally {
      setChecking(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const response = await api.post('/api/system/update')
      const payload = response.data
      if (!payload?.success) {
        throw new Error(payload?.message || t('Update failed'))
      }
      toast.success(
        t('Update to {{version}} successful. Service is restarting...', {
          version: payload.data?.version,
        })
      )
      setDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Update failed')
      toast.error(message)
    } finally {
      setUpdating(false)
    }
  }

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

  const goToRelease = () => {
    if (release?.html_url) {
      window.open(release.html_url, '_blank', 'noopener,noreferrer')
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
              <div className='text-lg font-semibold'>{version}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-sm'>
                {t('Uptime since')}
              </div>
              <div className='text-lg font-semibold'>{uptime}</div>
            </div>
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button onClick={handleCheckUpdates} disabled={checking}>
              {checking ? (
                t('Checking updates...')
              ) : (
                <>
                  <RefreshCcwIcon className='me-2 h-4 w-4' />
                  {t('Check for updates')}
                </>
              )}
            </Button>

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
            <Button
              variant='ghost'
              size='sm'
              onClick={fetchRollbackInfo}
              disabled={loadingRollback}
            >
              <RefreshCcwIcon className='me-2 h-4 w-4' />
              {t('Refresh')}
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
                    <div className='flex items-center gap-2'>
                      {item.html_url && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() =>
                            window.open(
                              item.html_url,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        >
                          <ExternalLinkIcon className='h-4 w-4' />
                        </Button>
                      )}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          release?.tag_name
            ? t('New version available: {{version}}', {
                version: release.tag_name,
              })
            : t('Release details')
        }
        description={
          release?.published_at
            ? `${t('Published')} ${formatTimestampToDate(
                new Date(release.published_at).getTime(),
                'milliseconds'
              )}`
            : undefined
        }
        contentClassName='max-h-[80vh] overflow-y-auto'
        contentHeight='auto'
        bodyClassName='space-y-4'
        footer={
          <>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setDialogOpen(false)}
            >
              {t('Close')}
            </Button>
            {release?.html_url && (
              <Button type='button' variant='outline' onClick={goToRelease}>
                <ExternalLinkIcon className='me-2 h-4 w-4' />
                {t('Open release')}
              </Button>
            )}
            <Button type='button' onClick={handleUpdate} disabled={updating}>
              {updating ? (
                t('Updating...')
              ) : (
                <>
                  <DownloadIcon className='me-2 h-4 w-4' />
                  {t('Update & Restart')}
                </>
              )}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          {release?.body ? (
            <Markdown>{release.body}</Markdown>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('No release notes provided.')}
            </p>
          )}
        </div>
      </Dialog>
    </>
  )
}

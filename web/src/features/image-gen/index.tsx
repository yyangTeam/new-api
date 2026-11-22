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
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { ExternalLink } from 'lucide-react'

export function ImageGen() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const url = status?.image_generation_url
  const openMode = status?.image_generation_open_mode ?? 'embed'

  if (!url) return null

  if (openMode === 'new_tab') {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4'>
        <ExternalLink className='h-12 w-12 text-muted-foreground' />
        <p className='text-muted-foreground'>{t('Click to open the image generation tool')}</p>
        <a
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          <ExternalLink className='h-4 w-4' />
          {t('Open Image Generation')}
        </a>
      </div>
    )
  }

  return (
    <div className='h-full w-full'>
      <iframe
        src={url}
        className='h-full w-full border-0'
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups'
        title='Image Generation'
      />
    </div>
  )
}

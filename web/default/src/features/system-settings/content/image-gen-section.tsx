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
import { useEffect } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
  SettingsForm,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const imageGenSchema = z.object({
  ImageGenerationUrl: z.string(),
})

type ImageGenFormValues = z.infer<typeof imageGenSchema>

type ImageGenSectionProps = {
  defaultValue: string
}

export function ImageGenSection({ defaultValue }: ImageGenSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const form = useForm<ImageGenFormValues>({
    resolver: zodResolver(imageGenSchema),
    defaultValues: { ImageGenerationUrl: defaultValue },
  })

  useEffect(() => {
    form.reset({ ImageGenerationUrl: defaultValue })
  }, [defaultValue, form])

  const onSubmit = async (values: ImageGenFormValues) => {
    if (values.ImageGenerationUrl === defaultValue) return
    await updateOption.mutateAsync({
      key: 'ImageGenerationUrl',
      value: values.ImageGenerationUrl,
    })
  }

  return (
    <SettingsSection title={t('Image Generation')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            saveLabel='Save image generation settings'
          />
          <FormField
            control={form.control}
            name='ImageGenerationUrl'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Embed URL')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://your-image-gen-site.com'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'The URL to embed in the Image Generation page. Leave empty to hide the menu item.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}

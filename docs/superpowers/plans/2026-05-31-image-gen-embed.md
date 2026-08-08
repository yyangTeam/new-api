# Image Generation Embed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Image Generation" sidebar item under Chat that renders a full-screen iframe whose URL admins configure in System Settings → Console Content.

**Architecture:** `ImageGenerationUrl` is stored as a string option in the DB, exposed via `/api/status` as `image_generation_url`, read by the frontend via `useStatus()`. The sidebar item appears only when the URL is non-empty and respects the existing two-layer admin × user permission system.

**Tech Stack:** Go (Gin, GORM), React 19, TanStack Router, TanStack Query, Zod, react-hook-form, lucide-react, i18next

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `common/constants.go` | Modify | Add `ImageGenerationUrl` variable |
| `model/option.go` | Modify | Register + handle string option |
| `controller/misc.go` | Modify | Expose in `/api/status` response |
| `web/default/src/features/auth/types.ts` | Modify | Add `image_generation_url` to `SystemStatus` |
| `web/default/src/features/system-settings/types.ts` | Modify | Add `ImageGenerationUrl` to `ContentSettings` |
| `web/default/src/features/system-settings/hooks/use-update-option.ts` | Modify | Add `ImageGenerationUrl` to status-refresh keys |
| `web/default/src/features/system-settings/content/image-gen-section.tsx` | Create | Settings form section for the URL |
| `web/default/src/features/system-settings/content/section-registry.tsx` | Modify | Register new section |
| `web/default/src/hooks/use-sidebar-config.ts` | Modify | Add `image_gen` module + URL mapping |
| `web/default/src/hooks/use-sidebar-data.ts` | Modify | Conditional nav item |
| `web/default/src/routes/_authenticated/image-gen/index.tsx` | Create | Route file |
| `web/default/src/features/image-gen/index.tsx` | Create | Full-screen iframe component |

---

## Task 1: Backend — Add `ImageGenerationUrl` constant and option handling

**Files:**
- Modify: `common/constants.go` (after line 71, near `DefaultCollapseSidebar`)
- Modify: `model/option.go` (two locations)

- [ ] **Step 1: Add the variable to `common/constants.go`**

Find the block around line 66–71:
```go
var DrawingEnabled = true
var TaskEnabled = true
var DataExportEnabled = true
var DataExportInterval = 5         // unit: minute
var DataExportDefaultTime = "hour" // unit: minute
var DefaultCollapseSidebar = false // default value of collapse sidebar
```

Add one line after `DefaultCollapseSidebar`:
```go
var DefaultCollapseSidebar = false // default value of collapse sidebar
var ImageGenerationUrl = ""
```

- [ ] **Step 2: Initialize in OptionMap (`model/option.go`, first switch block)**

Find around line 53:
```go
common.OptionMap["DrawingEnabled"] = strconv.FormatBool(common.DrawingEnabled)
```

After that block (near other string options like `common.OptionMap["SMTPServer"] = ""`), add:
```go
common.OptionMap["ImageGenerationUrl"] = common.ImageGenerationUrl
```

- [ ] **Step 3: Handle the save case (`model/option.go`, second switch block)**

Find around line 364–386 (the string-value switch, where `SMTPServer`, `WorkerUrl`, etc. are handled):
```go
case "WorkerUrl":
    system_setting.WorkerUrl = value
case "WorkerValidKey":
    system_setting.WorkerValidKey = value
```

Add after `WorkerValidKey`:
```go
case "ImageGenerationUrl":
    common.ImageGenerationUrl = value
```

- [ ] **Step 4: Commit**

```bash
git add common/constants.go model/option.go
git commit -m "feat(backend): add ImageGenerationUrl option"
```

---

## Task 2: Backend — Expose in `/api/status`

**Files:**
- Modify: `controller/misc.go` (around line 81–88)

- [ ] **Step 1: Add to the status response map**

Find around line 81–88 in `controller/misc.go`:
```go
"enable_drawing":                common.DrawingEnabled,
"enable_task":                   common.TaskEnabled,
"enable_data_export":            common.DataExportEnabled,
```

Add one line after `enable_data_export`:
```go
"enable_data_export":            common.DataExportEnabled,
"image_generation_url":          common.ImageGenerationUrl,
```

- [ ] **Step 2: Verify manually**

Start the backend and call:
```bash
curl -s http://localhost:3000/api/status | grep image_generation_url
```
Expected output: `"image_generation_url":""` (empty string by default).

- [ ] **Step 3: Commit**

```bash
git add controller/misc.go
git commit -m "feat(api): expose image_generation_url in /api/status"
```

---

## Task 3: Frontend types — Add `image_generation_url` to `SystemStatus` and `ContentSettings`

**Files:**
- Modify: `web/default/src/features/auth/types.ts`
- Modify: `web/default/src/features/system-settings/types.ts`

- [ ] **Step 1: Add to `SystemStatus` in `features/auth/types.ts`**

`SystemStatus` has two parallel blocks (a nested `data?` object and flat top-level properties, both with `[key: string]: unknown`). Add `image_generation_url?: string` in both blocks.

Find the flat top-level block (around line 134, after the closing `}` of `data?`):
```typescript
  // Allow direct access to common properties
  version?: string
  system_name?: string
```

Add after `password_register_enabled`:
```typescript
  password_register_enabled?: boolean
  image_generation_url?: string
  custom_oauth_providers?: CustomOAuthProviderInfo[]
```

Also add inside the nested `data?` object (around line 128):
```typescript
    register_enabled?: boolean
    password_login_enabled?: boolean
    password_register_enabled?: boolean
    image_generation_url?: string
    custom_oauth_providers?: CustomOAuthProviderInfo[]
```

- [ ] **Step 2: Add to `ContentSettings` in `features/system-settings/types.ts`**

Find `ContentSettings` (around line 118):
```typescript
export type ContentSettings = {
  'console_setting.api_info': string
  ...
  MjActionCheckSuccessEnabled: boolean
}
```

Add at the end of the type, before the closing `}`:
```typescript
  MjActionCheckSuccessEnabled: boolean
  ImageGenerationUrl: string
}
```

- [ ] **Step 3: Commit**

```bash
git add web/default/src/features/auth/types.ts web/default/src/features/system-settings/types.ts
git commit -m "feat(types): add ImageGenerationUrl to SystemStatus and ContentSettings"
```

---

## Task 4: Frontend — Settings section for `ImageGenerationUrl`

**Files:**
- Modify: `web/default/src/features/system-settings/hooks/use-update-option.ts`
- Create: `web/default/src/features/system-settings/content/image-gen-section.tsx`
- Modify: `web/default/src/features/system-settings/content/section-registry.tsx`

- [ ] **Step 1: Add `ImageGenerationUrl` to status-refresh keys in `use-update-option.ts`**

Find `STATUS_RELATED_KEYS` (around line 26):
```typescript
const STATUS_RELATED_KEYS = [
  'theme.frontend',
  'HeaderNavModules',
  'SidebarModulesAdmin',
  ...
]
```

Add `'ImageGenerationUrl'` to the array:
```typescript
const STATUS_RELATED_KEYS = [
  'theme.frontend',
  'HeaderNavModules',
  'SidebarModulesAdmin',
  'Notice',
  'LogConsumeEnabled',
  'QuotaPerUnit',
  'USDExchangeRate',
  'DisplayInCurrencyEnabled',
  'DisplayTokenStatEnabled',
  'ImageGenerationUrl',
  'general_setting.quota_display_type',
  'general_setting.custom_currency_symbol',
  'general_setting.custom_currency_exchange_rate',
]
```

- [ ] **Step 2: Create `image-gen-section.tsx`**

Create `web/default/src/features/system-settings/content/image-gen-section.tsx`:

```tsx
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
```

- [ ] **Step 3: Register the section in `section-registry.tsx`**

Add the import at the top of `web/default/src/features/system-settings/content/section-registry.tsx`:
```typescript
import { ImageGenSection } from './image-gen-section'
```

Then add to `CONTENT_SECTIONS` array, after the `drawing` entry:
```typescript
  {
    id: 'drawing',
    titleKey: 'Drawing',
    build: (settings: ContentSettings) => (
      <DrawingSettingsSection
        defaultValues={{
          DrawingEnabled: settings.DrawingEnabled,
          MjNotifyEnabled: settings.MjNotifyEnabled,
          MjAccountFilterEnabled: settings.MjAccountFilterEnabled,
          MjForwardUrlEnabled: settings.MjForwardUrlEnabled,
          MjModeClearEnabled: settings.MjModeClearEnabled,
          MjActionCheckSuccessEnabled: settings.MjActionCheckSuccessEnabled,
        }}
      />
    ),
  },
  {
    id: 'image-gen',
    titleKey: 'Image Generation',
    build: (settings: ContentSettings) => (
      <ImageGenSection defaultValue={settings.ImageGenerationUrl} />
    ),
  },
```

- [ ] **Step 4: Commit**

```bash
git add web/default/src/features/system-settings/hooks/use-update-option.ts \
        web/default/src/features/system-settings/content/image-gen-section.tsx \
        web/default/src/features/system-settings/content/section-registry.tsx
git commit -m "feat(settings): add Image Generation URL configuration section"
```

---

## Task 5: Frontend — Sidebar permission wiring

**Files:**
- Modify: `web/default/src/hooks/use-sidebar-config.ts`
- Modify: `web/default/src/hooks/use-sidebar-data.ts`

- [ ] **Step 1: Add `image_gen` to `DEFAULT_SIDEBAR_MODULES` in `use-sidebar-config.ts`**

Find `DEFAULT_SIDEBAR_MODULES` (around line 38):
```typescript
const DEFAULT_SIDEBAR_MODULES: SidebarModulesAdminConfig = {
  chat: {
    enabled: true,
    playground: true,
    chat: true,
  },
```

Add `image_gen: true`:
```typescript
  chat: {
    enabled: true,
    playground: true,
    chat: true,
    image_gen: true,
  },
```

- [ ] **Step 2: Add URL mapping in `URL_TO_CONFIG_MAP`**

Find `URL_TO_CONFIG_MAP` (around line 96):
```typescript
const URL_TO_CONFIG_MAP: Record<string, { section: string; module: string }> = {
  '/playground': { section: 'chat', module: 'playground' },
```

Add:
```typescript
  '/playground': { section: 'chat', module: 'playground' },
  '/image-gen': { section: 'chat', module: 'image_gen' },
```

- [ ] **Step 3: Add the conditional nav item in `use-sidebar-data.ts`**

Add `useStatus` import at the top of `web/default/src/hooks/use-sidebar-data.ts`:
```typescript
import { useStatus } from '@/hooks/use-status'
```

Add `Image` to the lucide-react import line:
```typescript
import {
  Activity,
  Box,
  CreditCard,
  FileText,
  FlaskConical,
  Image,
  Key,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Radio,
  Settings,
  Ticket,
  User,
  Users,
  Wallet,
} from 'lucide-react'
```

Inside `useSidebarData()`, add the `useStatus` call at the top of the function body:
```typescript
export function useSidebarData(): SidebarData {
  const { t } = useTranslation()
  const { status } = useStatus()
  const imageGenUrl = status?.image_generation_url
```

Then in the `chat` nav group items, add the conditional item after the Chat presets item:
```typescript
      {
        id: 'chat',
        title: t('Chat'),
        items: [
          {
            title: t('Playground'),
            url: '/playground',
            icon: FlaskConical,
          },
          {
            title: t('Chat'),
            icon: MessageSquare,
            type: 'chat-presets',
          },
          ...(imageGenUrl
            ? [
                {
                  title: t('Image Generation'),
                  url: '/image-gen',
                  icon: Image,
                },
              ]
            : []),
        ],
      },
```

- [ ] **Step 4: Commit**

```bash
git add web/default/src/hooks/use-sidebar-config.ts \
        web/default/src/hooks/use-sidebar-data.ts
git commit -m "feat(sidebar): add Image Generation nav item with permission wiring"
```

---

## Task 6: Frontend — Route and feature component

**Files:**
- Create: `web/default/src/routes/_authenticated/image-gen/index.tsx`
- Create: `web/default/src/features/image-gen/index.tsx`

- [ ] **Step 1: Create the feature component**

Create `web/default/src/features/image-gen/index.tsx`:

```tsx
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
import { useStatus } from '@/hooks/use-status'

export function ImageGen() {
  const { status } = useStatus()
  const url = status?.image_generation_url

  if (!url) return null

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
```

- [ ] **Step 2: Create the route file**

Create `web/default/src/routes/_authenticated/image-gen/index.tsx`:

```tsx
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
import { isSidebarModuleEnabled } from '@/lib/nav-modules'
import { Main } from '@/components/layout'
import { ImageGen } from '@/features/image-gen'

export const Route = createFileRoute('/_authenticated/image-gen/')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'image_gen')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ImageGenPage,
})

function ImageGenPage() {
  return (
    <Main className='p-0'>
      <ImageGen />
    </Main>
  )
}
```

- [ ] **Step 3: Verify route tree regeneration**

TanStack Router auto-generates `routeTree.gen.ts` on dev server start. Run:
```bash
cd web/default && bun run dev
```
Check the console — it should print something like `♻️  Regenerating route tree`. Confirm `/_authenticated/image-gen/` appears in `routeTree.gen.ts`.

- [ ] **Step 4: Commit**

```bash
git add web/default/src/features/image-gen/index.tsx \
        web/default/src/routes/_authenticated/image-gen/index.tsx \
        web/default/src/routeTree.gen.ts
git commit -m "feat(image-gen): add route and full-screen iframe page"
```

---

## Task 7: Manual end-to-end verification

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1 — backend
go run main.go

# Terminal 2 — frontend
cd web/default && bun run dev
```

- [ ] **Step 2: Verify menu item is hidden when URL is empty**

1. Log in as admin
2. Check the left sidebar → Chat group should have only Playground and Chat (no Image Generation)

- [ ] **Step 3: Configure URL in System Settings**

1. Go to System Settings → Console Content → Image Generation
2. Enter a URL (e.g. `https://example.com`) and save
3. Confirm toast shows "Setting updated successfully"

- [ ] **Step 4: Verify menu item appears and iframe loads**

1. Refresh the page
2. Sidebar Chat group should now show "Image Generation"
3. Click it → full-screen iframe should load `https://example.com`
4. No padding around the iframe (same as Playground layout)

- [ ] **Step 5: Verify permission toggle**

1. Go to System Settings → Site & Branding → Sidebar Modules Admin
2. Disable `chat.image_gen`
3. Confirm the menu item disappears for all users

- [ ] **Step 6: Clear the URL and verify auto-hide**

1. Go to Console Content → Image Generation
2. Clear the URL field and save
3. Refresh → menu item should disappear

- [ ] **Step 7: Commit any fixes, then update CHANGELOG**

Edit `CHANGELOG.md` — the `[Unreleased]` section should already have the entry added during brainstorming. Verify it reads:

```markdown
## [Unreleased]

### Added
- Image Generation embed page: admin-configurable iframe under the Chat sidebar section (see `docs/decisions/2026-05-31-image-gen-embed.md`)
```

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): mark image-gen-embed as implemented"
```

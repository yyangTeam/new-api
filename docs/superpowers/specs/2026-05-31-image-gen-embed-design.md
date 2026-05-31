# Image Generation Embed — Design Spec

**Date:** 2026-05-31  
**Branch:** feat/token-batch-edit  
**Status:** Approved

## Overview

Add an "Image Generation" menu item under the Chat section in the left sidebar. The page renders a full-screen iframe embedding an external URL that admins configure in System Settings → Console Content. The item is hidden when no URL is configured, and respects the existing two-layer sidebar permission system (admin × user).

## Requirements

- Admin configures the embed URL in System Settings → Console Content → Image Generation
- URL empty → menu item does not appear (auto-hidden regardless of permission config)
- URL set → item appears subject to admin sidebar module toggle and user preference
- Page layout: full-screen iframe, no padding (same as Playground)
- iframe sandboxed with: `allow-scripts allow-same-origin allow-forms allow-popups`

## Architecture

### Backend (Go)

**`common/constants.go`**
- Add `var ImageGenerationUrl = ""`

**`model/option.go`**
- Initialize: `common.OptionMap["ImageGenerationUrl"] = common.ImageGenerationUrl`
- Handle save: `case "ImageGenerationUrl": common.ImageGenerationUrl = val`

**`controller/misc.go`**
- Add to status response map: `"image_generation_url": common.ImageGenerationUrl`

### Frontend — System Settings

**`features/system-settings/types.ts`**
- Add `ImageGenerationUrl: string` to `ContentSettings` type

**`features/system-settings/content/image-gen-section.tsx`** (new file)
- Single URL text input field
- Uses `SettingsSection` + `useUpdateOption` pattern (same as other content sections)
- Saves to key `ImageGenerationUrl`

**`features/system-settings/content/section-registry.tsx`**
- Register new section: `{ id: 'image-gen', titleKey: 'Image Generation', build: (s) => <ImageGenSection defaultValue={s.ImageGenerationUrl} /> }`

### Frontend — Sidebar

**`hooks/use-sidebar-config.ts`**
- Add `image_gen: true` to `DEFAULT_SIDEBAR_MODULES.chat`
- Add `'/image-gen': { section: 'chat', module: 'image_gen' }` to `URL_TO_CONFIG_MAP`

**`hooks/use-sidebar-data.ts`**
- Import `useStatus()`
- Read `status?.image_generation_url` (string)
- Only include the nav item when value is a non-empty string:
  ```ts
  ...(imageGenUrl ? [{ title: t('Image Generation'), url: '/image-gen', icon: ImageIcon }] : [])
  ```
- Insert after the Chat presets item, within the `chat` nav group

### Frontend — Route & Feature

**`routes/_authenticated/image-gen/index.tsx`** (new file)
- `beforeLoad`: redirect to `/dashboard` when `isSidebarModuleEnabled('chat', 'image_gen')` is false
- Component: `<Main className='p-0'><ImageGen /></Main>`

**`features/image-gen/index.tsx`** (new file)
- Reads URL from `useStatus()` → `status?.image_generation_url`
- Renders full-screen iframe:
  ```tsx
  <iframe
    src={url}
    className="w-full h-full border-0"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    title="Image Generation"
  />
  ```
- Wraps in a `div` with `className="h-full w-full"` to fill the `Main` area

## Data Flow

```
Admin saves URL in System Settings
  → stored as OptionMap["ImageGenerationUrl"] in DB
  → returned in GET /api/status as image_generation_url
  → useStatus() provides it to:
      (a) use-sidebar-data.ts — controls menu item visibility
      (b) features/image-gen/index.tsx — used as iframe src
```

## Permission Logic

```
image_generation_url empty?
  └─ yes → item hidden (no route access needed)
  └─ no  → admin SidebarModulesAdmin.chat.image_gen === false?
               └─ yes → hidden for all users
               └─ no  → user sidebar_modules.chat.image_gen === false?
                            └─ yes → hidden for that user
                            └─ no  → item visible
```

## Files Changed

| File | Change |
|---|---|
| `common/constants.go` | Add variable |
| `model/option.go` | Initialize + handle case |
| `controller/misc.go` | Expose in status API |
| `features/system-settings/types.ts` | Add field to ContentSettings |
| `features/system-settings/content/image-gen-section.tsx` | New section component |
| `features/system-settings/content/section-registry.tsx` | Register section |
| `hooks/use-sidebar-config.ts` | Add module + URL mapping |
| `hooks/use-sidebar-data.ts` | Add conditional nav item |
| `routes/_authenticated/image-gen/index.tsx` | New route |
| `features/image-gen/index.tsx` | New feature component |

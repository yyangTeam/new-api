import { describe, it, expect, vi } from 'vitest'

vi.mock('i18next', () => ({ default: { t: (k: string) => k } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/currency', () => ({ formatCurrencyFromUSD: vi.fn(() => '$0') }))
vi.mock('@/features/channels/api', () => ({
  copyChannel: vi.fn(),
  deleteChannel: vi.fn(),
  testChannel: vi.fn(),
  updateChannel: vi.fn(),
  updateChannelStatus: vi.fn(),
  batchUpdateChannelStatus: vi.fn(),
  batchDeleteChannels: vi.fn(),
  batchSetChannelTag: vi.fn(),
  enableTagChannels: vi.fn(),
  disableTagChannels: vi.fn(),
  deleteDisabledChannels: vi.fn(),
  fixChannelAbilities: vi.fn(),
  editTagChannels: vi.fn(),
  testAllChannels: vi.fn(),
  updateAllChannelsBalance: vi.fn(),
  updateChannelBalance: vi.fn(),
}))

import {
  channelsQueryKeys,
  handleEnableChannel,
  handleDisableChannel,
  createChannelFieldUpdateScheduler,
  CHANNEL_FIELD_UPDATE_DELAY_MS,
  getModelCategory,
  categorizeModels,
} from '@/features/channels/lib/index'

describe('channels/lib/index exports', () => {
  it('exports channelsQueryKeys', () => {
    expect(channelsQueryKeys.all).toEqual(['channels'])
  })

  it('exports handleEnableChannel', () => {
    expect(typeof handleEnableChannel).toBe('function')
  })

  it('exports handleDisableChannel', () => {
    expect(typeof handleDisableChannel).toBe('function')
  })

  it('exports createChannelFieldUpdateScheduler', () => {
    expect(typeof createChannelFieldUpdateScheduler).toBe('function')
  })

  it('exports CHANNEL_FIELD_UPDATE_DELAY_MS', () => {
    expect(typeof CHANNEL_FIELD_UPDATE_DELAY_MS).toBe('number')
    expect(CHANNEL_FIELD_UPDATE_DELAY_MS).toBeGreaterThan(0)
  })

  it('exports getModelCategory', () => {
    expect(typeof getModelCategory).toBe('function')
  })

  it('exports categorizeModels', () => {
    expect(typeof categorizeModels).toBe('function')
  })
})

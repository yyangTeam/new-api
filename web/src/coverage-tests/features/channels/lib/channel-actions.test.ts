import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

import {
  channelsQueryKeys,
  handleEnableChannel,
  handleDisableChannel,
  handleToggleChannelStatus,
  handleDeleteChannel,
  handleUpdateChannelField,
  handleUpdateTagField,
  handleTestChannel,
  handleCopyChannel,
  handleUpdateChannelBalance,
  handleBatchDelete,
  handleBatchEnable,
  handleBatchDisable,
  handleBatchSetTag,
  handleEnableTagChannels,
  handleDisableTagChannels,
  handleDeleteAllDisabled,
  handleFixAbilities,
  handleTestAllChannels,
  handleUpdateAllBalances,
} from '@/features/channels/lib/channel-actions'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

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

vi.mock('@/lib/currency', () => ({
  formatCurrencyFromUSD: vi.fn(() => '$10.00'),
}))

import {
  copyChannel,
  deleteChannel,
  testChannel,
  updateChannel,
  updateChannelStatus,
  batchUpdateChannelStatus,
  batchDeleteChannels,
  batchSetChannelTag,
  enableTagChannels,
  disableTagChannels,
  deleteDisabledChannels,
  fixChannelAbilities,
  editTagChannels,
  testAllChannels,
  updateAllChannelsBalance,
  updateChannelBalance,
} from '@/features/channels/api'

const mockUpdateChannelStatus = updateChannelStatus as ReturnType<typeof vi.fn>
const mockDeleteChannel = deleteChannel as ReturnType<typeof vi.fn>
const mockUpdateChannel = updateChannel as ReturnType<typeof vi.fn>
const mockTestChannel = testChannel as ReturnType<typeof vi.fn>
const mockCopyChannel = copyChannel as ReturnType<typeof vi.fn>
const mockUpdateChannelBalance = updateChannelBalance as ReturnType<typeof vi.fn>
const mockBatchDeleteChannels = batchDeleteChannels as ReturnType<typeof vi.fn>
const mockBatchUpdateChannelStatus = batchUpdateChannelStatus as ReturnType<typeof vi.fn>
const mockBatchSetChannelTag = batchSetChannelTag as ReturnType<typeof vi.fn>
const mockEnableTagChannels = enableTagChannels as ReturnType<typeof vi.fn>
const mockDisableTagChannels = disableTagChannels as ReturnType<typeof vi.fn>
const mockDeleteDisabledChannels = deleteDisabledChannels as ReturnType<typeof vi.fn>
const mockFixChannelAbilities = fixChannelAbilities as ReturnType<typeof vi.fn>
const mockEditTagChannels = editTagChannels as ReturnType<typeof vi.fn>
const mockTestAllChannels = testAllChannels as ReturnType<typeof vi.fn>
const mockUpdateAllChannelsBalance = updateAllChannelsBalance as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('channelsQueryKeys', () => {
  it('generates all key', () => {
    expect(channelsQueryKeys.all).toEqual(['channels'])
  })

  it('generates lists key', () => {
    expect(channelsQueryKeys.lists()).toEqual(['channels', 'list'])
  })

  it('generates list key with params', () => {
    expect(channelsQueryKeys.list({ p: 1 })).toEqual([
      'channels',
      'list',
      { p: 1 },
    ])
  })

  it('generates details key', () => {
    expect(channelsQueryKeys.details()).toEqual(['channels', 'detail'])
  })

  it('generates detail key with id', () => {
    expect(channelsQueryKeys.detail(5)).toEqual(['channels', 'detail', 5])
  })
})

describe('handleEnableChannel', () => {
  it('enables a channel and shows success toast', async () => {
    mockUpdateChannelStatus.mockResolvedValue({ success: true })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleEnableChannel(1, queryClient as any, onSuccess)
    expect(mockUpdateChannelStatus).toHaveBeenCalledWith(1, 1)
    expect(toast.success).toHaveBeenCalled()
    expect(queryClient.invalidateQueries).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockUpdateChannelStatus.mockResolvedValue({
      success: false,
      message: 'fail',
    })
    await handleEnableChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows error on exception', async () => {
    mockUpdateChannelStatus.mockRejectedValue(new Error('network'))
    await handleEnableChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleDisableChannel', () => {
  it('disables a channel and shows success toast', async () => {
    mockUpdateChannelStatus.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleDisableChannel(1, undefined, onSuccess)
    expect(mockUpdateChannelStatus).toHaveBeenCalledWith(1, 2)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error message from response', async () => {
    mockUpdateChannelStatus.mockResolvedValue({
      success: false,
      message: 'custom error',
    })
    await handleDisableChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockUpdateChannelStatus.mockRejectedValue(new Error('x'))
    await handleDisableChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleToggleChannelStatus', () => {
  it('disables when currently enabled', async () => {
    mockUpdateChannelStatus.mockResolvedValue({ success: true })
    await handleToggleChannelStatus(1, 1)
    expect(mockUpdateChannelStatus).toHaveBeenCalledWith(1, 2)
  })

  it('enables when currently disabled', async () => {
    mockUpdateChannelStatus.mockResolvedValue({ success: true })
    await handleToggleChannelStatus(1, 2)
    expect(mockUpdateChannelStatus).toHaveBeenCalledWith(1, 1)
  })
})

describe('handleDeleteChannel', () => {
  it('deletes channel on success', async () => {
    mockDeleteChannel.mockResolvedValue({ success: true })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleDeleteChannel(1, queryClient as any, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure response', async () => {
    mockDeleteChannel.mockResolvedValue({ success: false, message: 'nope' })
    await handleDeleteChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockDeleteChannel.mockRejectedValue(new Error('x'))
    await handleDeleteChannel(1)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleUpdateChannelField', () => {
  it('updates field on success', async () => {
    mockUpdateChannel.mockResolvedValue({ success: true })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleUpdateChannelField(1, 'priority', 5, queryClient as any, onSuccess)
    expect(mockUpdateChannel).toHaveBeenCalledWith(1, { priority: 5 })
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockUpdateChannel.mockResolvedValue({ success: false })
    await handleUpdateChannelField(1, 'priority', 5)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockUpdateChannel.mockRejectedValue(new Error('x'))
    await handleUpdateChannelField(1, 'priority', 5)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleUpdateTagField', () => {
  it('updates tag field on success', async () => {
    mockEditTagChannels.mockResolvedValue({ success: true })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleUpdateTagField('prod', 'priority', 10, queryClient as any, onSuccess)
    expect(mockEditTagChannels).toHaveBeenCalledWith({ tag: 'prod', priority: 10 })
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockEditTagChannels.mockResolvedValue({ success: false })
    await handleUpdateTagField('prod', 'weight', 5)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockEditTagChannels.mockRejectedValue(new Error('x'))
    await handleUpdateTagField('prod', 'weight', 5)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleTestChannel', () => {
  it('shows success toast with response time from data', async () => {
    mockTestChannel.mockResolvedValue({
      success: true,
      data: { response_time: 500 },
    })
    const onComplete = vi.fn()
    await handleTestChannel(1, { channelName: 'Test' }, onComplete)
    expect(toast.success).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith(true, 500)
  })

  it('shows success toast with response time from time field (seconds)', async () => {
    mockTestChannel.mockResolvedValue({
      success: true,
      time: 1.5,
    })
    const onComplete = vi.fn()
    await handleTestChannel(1, {}, onComplete)
    expect(onComplete).toHaveBeenCalledWith(true, 1500)
  })

  it('shows failure toast with error code', async () => {
    mockTestChannel.mockResolvedValue({
      success: false,
      message: 'timeout',
      error_code: 'TIMEOUT',
    })
    const onComplete = vi.fn()
    await handleTestChannel(1, { channelName: 'Ch', testModel: 'gpt-4' }, onComplete)
    expect(toast.error).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith(false, undefined, 'timeout', 'TIMEOUT')
  })

  it('handles exception with response data', async () => {
    mockTestChannel.mockRejectedValue({
      response: { data: { message: 'server error' } },
    })
    const onComplete = vi.fn()
    await handleTestChannel(1, { testModel: 'gpt-4' }, onComplete)
    expect(toast.error).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith(false, undefined, 'server error')
  })

  it('silent mode suppresses toasts', async () => {
    mockTestChannel.mockResolvedValue({ success: true })
    await handleTestChannel(1, { silent: true })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('silent mode suppresses error toasts', async () => {
    mockTestChannel.mockResolvedValue({ success: false, message: 'fail' })
    await handleTestChannel(1, { silent: true })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('passes endpoint_type and stream in payload', async () => {
    mockTestChannel.mockResolvedValue({ success: true })
    await handleTestChannel(1, {
      testModel: 'gpt-4',
      endpointType: 'chat',
      stream: true,
    })
    expect(mockTestChannel).toHaveBeenCalledWith(1, {
      model: 'gpt-4',
      endpoint_type: 'chat',
      stream: true,
    })
  })

  it('formats response time >= 1000ms as seconds', async () => {
    mockTestChannel.mockResolvedValue({
      success: true,
      data: { response_time: 2500 },
    })
    await handleTestChannel(1)
    expect(toast.success).toHaveBeenCalled()
  })

  it('formats response time < 1000ms as ms', async () => {
    mockTestChannel.mockResolvedValue({
      success: true,
      data: { response_time: 300 },
    })
    await handleTestChannel(1)
    expect(toast.success).toHaveBeenCalled()
  })

  it('handles no channel name or model gracefully', async () => {
    mockTestChannel.mockResolvedValue({ success: true })
    await handleTestChannel(1)
    expect(toast.success).toHaveBeenCalled()
  })
})

describe('handleCopyChannel', () => {
  it('copies channel on success', async () => {
    mockCopyChannel.mockResolvedValue({
      success: true,
      data: { id: 99 },
    })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleCopyChannel(1, {}, queryClient as any, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(99)
  })

  it('shows error on failure', async () => {
    mockCopyChannel.mockResolvedValue({ success: false, message: 'nope' })
    await handleCopyChannel(1, {})
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockCopyChannel.mockRejectedValue(new Error('x'))
    await handleCopyChannel(1, {})
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleUpdateChannelBalance', () => {
  it('updates balance on success', async () => {
    mockUpdateChannelBalance.mockResolvedValue({
      success: true,
      balance: 50.5,
    })
    const queryClient = { invalidateQueries: vi.fn() }
    const onSuccess = vi.fn()
    await handleUpdateChannelBalance(1, queryClient as any, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(50.5)
  })

  it('shows error when balance undefined', async () => {
    mockUpdateChannelBalance.mockResolvedValue({ success: true })
    await handleUpdateChannelBalance(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows error on failure response', async () => {
    mockUpdateChannelBalance.mockResolvedValue({
      success: false,
      message: 'err',
    })
    await handleUpdateChannelBalance(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles Error instance', async () => {
    mockUpdateChannelBalance.mockRejectedValue(new Error('fail'))
    await handleUpdateChannelBalance(1)
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles non-Error exception', async () => {
    mockUpdateChannelBalance.mockRejectedValue('unexpected')
    await handleUpdateChannelBalance(1)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleBatchDelete', () => {
  it('shows error for empty ids', async () => {
    await handleBatchDelete([])
    expect(toast.error).toHaveBeenCalled()
  })

  it('deletes on success', async () => {
    mockBatchDeleteChannels.mockResolvedValue({ success: true, data: 2 })
    const onSuccess = vi.fn()
    await handleBatchDelete([1, 2], undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(2)
  })

  it('uses ids.length when data is undefined', async () => {
    mockBatchDeleteChannels.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleBatchDelete([1, 2, 3], undefined, onSuccess)
    expect(onSuccess).toHaveBeenCalledWith(3)
  })

  it('shows error on failure', async () => {
    mockBatchDeleteChannels.mockResolvedValue({ success: false })
    await handleBatchDelete([1])
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockBatchDeleteChannels.mockRejectedValue(new Error('x'))
    await handleBatchDelete([1])
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleBatchEnable', () => {
  it('shows error for empty ids', async () => {
    await handleBatchEnable([])
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows success and error when partial success', async () => {
    mockBatchUpdateChannelStatus.mockResolvedValue({ success: true, data: 2 })
    await handleBatchEnable([1, 2, 3])
    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled() // 1 failed
  })

  it('shows error when not successful', async () => {
    mockBatchUpdateChannelStatus.mockResolvedValue({
      success: false,
      message: 'err',
    })
    await handleBatchEnable([1])
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockBatchUpdateChannelStatus.mockRejectedValue(new Error('x'))
    await handleBatchEnable([1])
    expect(toast.error).toHaveBeenCalled()
  })

  it('calls onSuccess when all succeed', async () => {
    mockBatchUpdateChannelStatus.mockResolvedValue({ success: true, data: 2 })
    const onSuccess = vi.fn()
    await handleBatchEnable([1, 2], undefined, onSuccess)
    expect(onSuccess).toHaveBeenCalled()
  })
})

describe('handleBatchDisable', () => {
  it('shows error for empty ids', async () => {
    await handleBatchDisable([])
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows success and handles partial failures', async () => {
    mockBatchUpdateChannelStatus.mockResolvedValue({ success: true, data: 1 })
    await handleBatchDisable([1, 2])
    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows error when not successful', async () => {
    mockBatchUpdateChannelStatus.mockResolvedValue({ success: false })
    await handleBatchDisable([1])
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockBatchUpdateChannelStatus.mockRejectedValue(new Error('x'))
    await handleBatchDisable([1])
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleBatchSetTag', () => {
  it('shows error for empty ids', async () => {
    await handleBatchSetTag([], 'tag')
    expect(toast.error).toHaveBeenCalled()
  })

  it('sets tag on success', async () => {
    mockBatchSetChannelTag.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleBatchSetTag([1, 2], 'prod', undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('sets null tag', async () => {
    mockBatchSetChannelTag.mockResolvedValue({ success: true })
    await handleBatchSetTag([1], null)
    expect(mockBatchSetChannelTag).toHaveBeenCalledWith({ ids: [1], tag: null })
  })

  it('shows error on failure', async () => {
    mockBatchSetChannelTag.mockResolvedValue({ success: false })
    await handleBatchSetTag([1], 'tag')
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockBatchSetChannelTag.mockRejectedValue(new Error('x'))
    await handleBatchSetTag([1], 'tag')
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleEnableTagChannels', () => {
  it('enables tag channels on success', async () => {
    mockEnableTagChannels.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleEnableTagChannels('prod', undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockEnableTagChannels.mockResolvedValue({ success: false })
    await handleEnableTagChannels('prod')
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockEnableTagChannels.mockRejectedValue(new Error('x'))
    await handleEnableTagChannels('prod')
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleDisableTagChannels', () => {
  it('disables tag channels on success', async () => {
    mockDisableTagChannels.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleDisableTagChannels('prod', undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockDisableTagChannels.mockResolvedValue({ success: false })
    await handleDisableTagChannels('prod')
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockDisableTagChannels.mockRejectedValue(new Error('x'))
    await handleDisableTagChannels('prod')
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleDeleteAllDisabled', () => {
  it('deletes disabled channels on success', async () => {
    mockDeleteDisabledChannels.mockResolvedValue({ success: true, data: 5 })
    const onSuccess = vi.fn()
    await handleDeleteAllDisabled(undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(5)
  })

  it('shows error on failure', async () => {
    mockDeleteDisabledChannels.mockResolvedValue({ success: false })
    await handleDeleteAllDisabled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockDeleteDisabledChannels.mockRejectedValue(new Error('x'))
    await handleDeleteAllDisabled()
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleFixAbilities', () => {
  it('fixes abilities on success', async () => {
    mockFixChannelAbilities.mockResolvedValue({
      success: true,
      data: { success: 10, fails: 2 },
    })
    const onSuccess = vi.fn()
    await handleFixAbilities(undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({ success: 10, fails: 2 })
  })

  it('shows error when no data', async () => {
    mockFixChannelAbilities.mockResolvedValue({ success: true })
    await handleFixAbilities()
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockFixChannelAbilities.mockResolvedValue({ success: false })
    await handleFixAbilities()
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockFixChannelAbilities.mockRejectedValue(new Error('x'))
    await handleFixAbilities()
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleTestAllChannels', () => {
  it('tests all on success', async () => {
    mockTestAllChannels.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleTestAllChannels(undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockTestAllChannels.mockResolvedValue({ success: false })
    await handleTestAllChannels()
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockTestAllChannels.mockRejectedValue(new Error('x'))
    await handleTestAllChannels()
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('handleUpdateAllBalances', () => {
  it('updates all balances on success', async () => {
    mockUpdateAllChannelsBalance.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    await handleUpdateAllBalances(undefined, onSuccess)
    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error on failure', async () => {
    mockUpdateAllChannelsBalance.mockResolvedValue({ success: false })
    await handleUpdateAllBalances()
    expect(toast.error).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockUpdateAllChannelsBalance.mockRejectedValue(new Error('x'))
    await handleUpdateAllBalances()
    expect(toast.error).toHaveBeenCalled()
  })
})

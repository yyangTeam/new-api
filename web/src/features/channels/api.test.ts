import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getChannels,
  searchChannels,
  getChannel,
  getChannelOps,
  createChannel,
  updateChannel,
  updateChannelStatus,
  batchUpdateChannelStatus,
  deleteChannel,
  batchDeleteChannels,
  batchSetChannelTag,
  testChannel,
  updateChannelBalance,
  fetchUpstreamModels,
  copyChannel,
  fixChannelAbilities,
  deleteDisabledChannels,
  getChannelKey,
  refreshCodexCredential,
  getCodexUsage,
  getCodexResetCredits,
  resetCodexUsage,
  manageMultiKeys,
  getMultiKeyStatus,
  enableMultiKey,
  disableMultiKey,
  deleteMultiKey,
  enableAllMultiKeys,
  disableAllMultiKeys,
  deleteDisabledMultiKeys,
  enableTagChannels,
  disableTagChannels,
  editTagChannels,
  getTagModels,
  fetchModels,
  deleteOllamaModel,
  testAllChannels,
  updateAllChannelsBalance,
  getAllModels,
  getEnabledModels,
  getOllamaVersion,
  getGroups,
  getPrefillGroups,
} from './api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/features/users/api', () => ({
  getGroups: vi.fn().mockResolvedValue({ success: true, data: ['default'] }),
}))

import { api } from '@/lib/api'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('channels/api', () => {
  describe('getChannels', () => {
    it('fetches channels with default params', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const result = await getChannels()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel', { params: {} })
      expect(result).toEqual({ success: true, data: [] })
    })

    it('fetches channels with custom params', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [], total: 5 },
      })
      const params = { p: 2, page_size: 10 }
      const result = await getChannels(params)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel', { params })
      expect(result).toEqual({ success: true, data: [], total: 5 })
    })
  })

  describe('searchChannels', () => {
    it('searches channels with filters', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [] } })
      const params = { keyword: 'test', status: 'enabled' as const }
      await searchChannels(params)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/search', {
        params,
      })
    })
  })

  describe('getChannel', () => {
    it('fetches a single channel by ID', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { id: 5 } },
      })
      const result = await getChannel(5)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/5')
      expect(result).toEqual({ success: true, data: { id: 5 } })
    })
  })

  describe('getChannelOps', () => {
    it('fetches channel ops summary', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { total: 10 } },
      })
      const result = await getChannelOps()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/ops', {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
      expect(result).toEqual({ success: true, data: { total: 10 } })
    })
  })

  describe('createChannel', () => {
    it('creates a channel', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      const data = { name: 'test', type: 1, key: 'sk-123', models: 'gpt-4', group: 'default' } as any
      const result = await createChannel(data)
      expect(mockApi.post).toHaveBeenCalledWith('/api/channel', data, {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
      expect(result).toEqual({ success: true })
    })
  })

  describe('updateChannel', () => {
    it('updates a channel', async () => {
      mockApi.put.mockResolvedValue({
        data: { success: true, data: { id: 1 } },
      })
      const result = await updateChannel(1, { name: 'updated' })
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/channel/',
        { id: 1, name: 'updated' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: { id: 1 } })
    })
  })

  describe('updateChannelStatus', () => {
    it('updates channel status', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await updateChannelStatus(1, 2)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/1/status',
        { status: 2 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })
  })

  describe('batchUpdateChannelStatus', () => {
    it('batch updates channel status', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: 3 } })
      const result = await batchUpdateChannelStatus([1, 2, 3], 1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/status/batch',
        { ids: [1, 2, 3], status: 1 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: 3 })
    })
  })

  describe('deleteChannel', () => {
    it('deletes a channel', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } })
      await deleteChannel(5)
      expect(mockApi.delete).toHaveBeenCalledWith('/api/channel/5', {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
    })
  })

  describe('batchDeleteChannels', () => {
    it('batch deletes channels', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: 2 } })
      const result = await batchDeleteChannels({ ids: [1, 2] })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/batch',
        { ids: [1, 2] },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: 2 })
    })
  })

  describe('batchSetChannelTag', () => {
    it('batch sets channel tags', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: 3 } })
      const result = await batchSetChannelTag({ ids: [1, 2, 3], tag: 'prod' })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/batch/tag',
        { ids: [1, 2, 3], tag: 'prod' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: 3 })
    })
  })

  describe('testChannel', () => {
    it('tests a channel without params', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, time: 0.5 } })
      await testChannel(1)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/test/1', {
        skipBusinessError: true,
        skipErrorHandler: true,
        params: undefined,
      })
    })

    it('tests a channel with model and stream params', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true } })
      await testChannel(1, { model: 'gpt-4', stream: true })
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/test/1', {
        skipBusinessError: true,
        skipErrorHandler: true,
        params: { model: 'gpt-4', stream: true },
      })
    })
  })

  describe('updateChannelBalance', () => {
    it('updates channel balance', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, balance: 100.5 },
      })
      const result = await updateChannelBalance(1)
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/channel/update_balance/1',
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, balance: 100.5 })
    })
  })

  describe('fetchUpstreamModels', () => {
    it('fetches upstream models', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: ['gpt-4'] },
      })
      const result = await fetchUpstreamModels(1)
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/channel/fetch_models/1',
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: ['gpt-4'] })
    })
  })

  describe('copyChannel', () => {
    it('copies a channel without params', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { id: 2 } },
      })
      const result = await copyChannel(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/copy/1',
        null,
        { skipBusinessError: true, skipErrorHandler: true, params: {} }
      )
      expect(result).toEqual({ success: true, data: { id: 2 } })
    })

    it('copies a channel with params', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { id: 3 } },
      })
      await copyChannel(1, { name: 'Copy' })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/copy/1',
        null,
        {
          skipBusinessError: true,
          skipErrorHandler: true,
          params: { name: 'Copy' },
        }
      )
    })
  })

  describe('fixChannelAbilities', () => {
    it('fixes channel abilities', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { success: 5, fails: 0 } },
      })
      const result = await fixChannelAbilities()
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/fix',
        undefined,
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({
        success: true,
        data: { success: 5, fails: 0 },
      })
    })
  })

  describe('deleteDisabledChannels', () => {
    it('deletes disabled channels', async () => {
      mockApi.delete.mockResolvedValue({
        data: { success: true, data: 3 },
      })
      const result = await deleteDisabledChannels()
      expect(mockApi.delete).toHaveBeenCalledWith('/api/channel/disabled', {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
      expect(result).toEqual({ success: true, data: 3 })
    })
  })

  describe('getChannelKey', () => {
    it('gets channel key without proof token', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { key: 'sk-xxx' } },
      })
      const result = await getChannelKey(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/1/key',
        undefined,
        { skipBusinessError: true, skipErrorHandler: true, headers: undefined }
      )
      expect(result).toEqual({ success: true, data: { key: 'sk-xxx' } })
    })

    it('gets channel key with proof token', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: { key: 'sk-xxx' } },
      })
      await getChannelKey(1, 'proof-token-123')
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/1/key',
        undefined,
        {
          skipBusinessError: true,
          skipErrorHandler: true,
          headers: { 'X-Security-Proof': 'proof-token-123' },
        }
      )
    })
  })

  describe('Codex operations', () => {
    it('refreshCodexCredential', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await refreshCodexCredential(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/1/codex/refresh',
        {},
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('getCodexUsage', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { used: 100 } },
      })
      const result = await getCodexUsage(1)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/1/codex/usage', {
        skipBusinessError: true,
        skipErrorHandler: true,
        disableDuplicate: true,
      })
      expect(result).toEqual({ success: true, data: { used: 100 } })
    })

    it('getCodexResetCredits', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true } })
      await getCodexResetCredits(1)
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/channel/1/codex/usage/reset-credits',
        { skipBusinessError: true, skipErrorHandler: true, disableDuplicate: true }
      )
    })

    it('resetCodexUsage', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await resetCodexUsage(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/1/codex/usage/reset',
        {},
        { skipBusinessError: true, skipErrorHandler: true, disableDuplicate: true }
      )
    })
  })

  describe('Multi-Key Management', () => {
    it('manageMultiKeys posts params', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await manageMultiKeys({ channel_id: 1, action: 'get_key_status' })
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'get_key_status' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('getMultiKeyStatus calls manageMultiKeys with correct params', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: [] } })
      await getMultiKeyStatus(1, 2, 25, 1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'get_key_status', page: 2, page_size: 25, status: 1 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('getMultiKeyStatus uses default page and pageSize', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await getMultiKeyStatus(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'get_key_status', page: 1, page_size: 50, status: undefined },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('enableMultiKey', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await enableMultiKey(1, 2)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'enable_key', key_index: 2 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('disableMultiKey', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await disableMultiKey(1, 3)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'disable_key', key_index: 3 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('deleteMultiKey', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await deleteMultiKey(1, 0)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'delete_key', key_index: 0 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('enableAllMultiKeys', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await enableAllMultiKeys(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'enable_all_keys' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('disableAllMultiKeys', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await disableAllMultiKeys(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'disable_all_keys' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('deleteDisabledMultiKeys', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: 2 } })
      const result = await deleteDisabledMultiKeys(1)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/multi_key/manage',
        { channel_id: 1, action: 'delete_disabled_keys' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual({ success: true, data: 2 })
    })
  })

  describe('Tag Operations', () => {
    it('enableTagChannels', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await enableTagChannels('prod')
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/tag/enabled',
        { tag: 'prod' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('disableTagChannels', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } })
      await disableTagChannels('staging')
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/tag/disabled',
        { tag: 'staging' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('editTagChannels', async () => {
      mockApi.put.mockResolvedValue({ data: { success: true } })
      await editTagChannels({ tag: 'prod', priority: 5 })
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/channel/tag',
        { tag: 'prod', priority: 5 },
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('getTagModels', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: 'gpt-4,gpt-3.5-turbo' },
      })
      const result = await getTagModels('prod')
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/tag/models', {
        params: { tag: 'prod' },
      })
      expect(result).toEqual({ success: true, data: 'gpt-4,gpt-3.5-turbo' })
    })
  })

  describe('Utility Functions', () => {
    it('fetchModels', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true, data: ['gpt-4'] },
      })
      const data = { base_url: 'https://api.openai.com', type: 1, key: 'sk-123' }
      await fetchModels(data)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/channel/fetch_models',
        data,
        { skipBusinessError: true, skipErrorHandler: true }
      )
    })

    it('deleteOllamaModel', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } })
      await deleteOllamaModel({ channel_id: 1, model_name: 'llama2' })
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/channel/ollama/delete',
        {
          skipBusinessError: true,
          skipErrorHandler: true,
          data: { channel_id: 1, model_name: 'llama2' },
        }
      )
    })

    it('testAllChannels', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true } })
      await testAllChannels()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/test', {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
    })

    it('updateAllChannelsBalance', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true } })
      await updateAllChannelsBalance()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/update_balance', {
        skipBusinessError: true,
        skipErrorHandler: true,
      })
    })

    it('getAllModels', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [{ id: 'gpt-4' }] },
      })
      const result = await getAllModels()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/models')
      expect(result).toEqual({ success: true, data: [{ id: 'gpt-4' }] })
    })

    it('getEnabledModels', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: ['gpt-4'] },
      })
      const result = await getEnabledModels()
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/models_enabled')
      expect(result).toEqual({ success: true, data: ['gpt-4'] })
    })

    it('getOllamaVersion', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { version: '0.1.0' } },
      })
      const result = await getOllamaVersion(1)
      expect(mockApi.get).toHaveBeenCalledWith('/api/channel/ollama/version/1')
      expect(result).toEqual({ success: true, data: { version: '0.1.0' } })
    })

    it('getGroups delegates to users API', async () => {
      const result = await getGroups()
      expect(result).toEqual({ success: true, data: ['default'] })
    })

    it('getPrefillGroups with default type', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [] },
      })
      await getPrefillGroups()
      expect(mockApi.get).toHaveBeenCalledWith('/api/prefill_group', {
        params: { type: 'model' },
      })
    })

    it('getPrefillGroups with group type', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [] },
      })
      await getPrefillGroups('group')
      expect(mockApi.get).toHaveBeenCalledWith('/api/prefill_group', {
        params: { type: 'group' },
      })
    })
  })
})

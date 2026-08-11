import { describe, it, expect, vi, beforeEach } from 'vitest'

import { sendChatCompletion, getUserModels, getUserGroups } from '@/features/playground/api'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

describe('playground api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendChatCompletion', () => {
    it('posts to chat completions endpoint and returns data', async () => {
      const responseData = { id: 'chatcmpl-1', choices: [] }
      mockPost.mockResolvedValue({ data: responseData })

      const payload = {
        model: 'gpt-4o',
        messages: [{ role: 'user' as const, content: 'hello' }],
        stream: false,
      }
      const result = await sendChatCompletion(payload)

      expect(mockPost).toHaveBeenCalledWith(
        '/pg/chat/completions',
        payload,
        expect.objectContaining({ skipErrorHandler: true })
      )
      expect(result).toEqual(responseData)
    })

    it('passes abort signal', async () => {
      mockPost.mockResolvedValue({ data: {} })
      const controller = new AbortController()

      await sendChatCompletion(
        { model: 'gpt-4o', messages: [], stream: false },
        controller.signal
      )

      expect(mockPost).toHaveBeenCalledWith(
        '/pg/chat/completions',
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal })
      )
    })
  })

  describe('getUserModels', () => {
    it('returns model options on success', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: ['gpt-4o', 'gpt-3.5-turbo'] },
      })

      const result = await getUserModels('default')

      expect(mockGet).toHaveBeenCalledWith('/api/user/models', {
        params: { group: 'default' },
      })
      expect(result).toEqual([
        { label: 'gpt-4o', value: 'gpt-4o' },
        { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
      ])
    })

    it('returns empty array when success is false', async () => {
      mockGet.mockResolvedValue({
        data: { success: false, data: null },
      })

      const result = await getUserModels('default')
      expect(result).toEqual([])
    })

    it('returns empty array when data is not an array', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: 'not-an-array' },
      })

      const result = await getUserModels('default')
      expect(result).toEqual([])
    })
  })

  describe('getUserGroups', () => {
    it('returns group options on success', async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            default: { desc: 'Default group', ratio: 1.0 },
            vip: { desc: 'VIP group', ratio: 0.8 },
          },
        },
      })

      const result = await getUserGroups()

      expect(mockGet).toHaveBeenCalledWith('/api/user/self/groups')
      expect(result).toEqual([
        { label: 'default', value: 'default', ratio: 1.0, desc: 'Default group' },
        { label: 'vip', value: 'vip', ratio: 0.8, desc: 'VIP group' },
      ])
    })

    it('returns empty array when success is false', async () => {
      mockGet.mockResolvedValue({
        data: { success: false, data: null },
      })

      const result = await getUserGroups()
      expect(result).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: null },
      })

      const result = await getUserGroups()
      expect(result).toEqual([])
    })
  })
})

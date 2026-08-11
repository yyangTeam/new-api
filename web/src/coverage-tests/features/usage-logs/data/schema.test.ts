import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { usageLogSchema } from '@/features/usage-logs/data/schema'

describe('usage-logs/data/schema', () => {
  describe('usageLogSchema', () => {
    it('parses a complete valid log', () => {
      const input = {
        id: 1,
        user_id: 10,
        created_at: 1700000000,
        type: 2,
        content: 'test content',
        username: 'admin',
        token_name: 'test-token',
        model_name: 'gpt-4',
        quota: 500,
        prompt_tokens: 100,
        completion_tokens: 200,
        use_time: 1500,
        is_stream: true,
        channel: 5,
        channel_name: 'OpenAI',
        token_id: 3,
        group: 'default',
        ip: '192.168.1.1',
        other: '{}',
        request_id: 'req-123',
        upstream_request_id: 'up-456',
      }
      const result = usageLogSchema.parse(input)
      expect(result).toEqual(input)
    })

    it('applies defaults for optional fields', () => {
      const input = {
        id: 1,
        user_id: 10,
        created_at: 1700000000,
        type: 2,
        content: 'test',
      }
      const result = usageLogSchema.parse(input)
      expect(result.username).toBe('')
      expect(result.token_name).toBe('')
      expect(result.model_name).toBe('')
      expect(result.quota).toBe(0)
      expect(result.prompt_tokens).toBe(0)
      expect(result.completion_tokens).toBe(0)
      expect(result.use_time).toBe(0)
      expect(result.is_stream).toBe(false)
      expect(result.channel).toBe(0)
      expect(result.channel_name).toBe('')
      expect(result.token_id).toBe(0)
      expect(result.group).toBe('')
      expect(result.ip).toBe('')
      expect(result.other).toBe('')
      expect(result.request_id).toBe('')
      expect(result.upstream_request_id).toBe('')
    })

    it('handles null channel_name', () => {
      const input = {
        id: 1,
        user_id: 10,
        created_at: 1700000000,
        type: 0,
        content: '',
        channel_name: null,
      }
      const result = usageLogSchema.parse(input)
      expect(result.channel_name).toBeNull()
    })

    it('rejects missing required fields', () => {
      expect(() => usageLogSchema.parse({})).toThrow(z.ZodError)
      expect(() => usageLogSchema.parse({ id: 1 })).toThrow(z.ZodError)
    })

    it('rejects invalid type for id', () => {
      expect(() =>
        usageLogSchema.parse({
          id: 'not-a-number',
          user_id: 1,
          created_at: 1,
          type: 0,
          content: '',
        })
      ).toThrow(z.ZodError)
    })
  })
})

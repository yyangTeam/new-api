import { buildChatCompletionPayload } from './payload-builder'
import type {
  Message,
  PlaygroundConfig,
  ParameterEnabled,
} from '../../types'

vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}))

function makeMessage(
  from: 'user' | 'assistant' | 'system',
  content: string
): Message {
  return {
    key: 'msg-' + content,
    from,
    versions: [{ id: 'v1', content }],
  }
}

const baseConfig: PlaygroundConfig = {
  model: 'gpt-4o',
  group: 'default',
  temperature: 0.7,
  top_p: 1,
  max_tokens: 4096,
  frequency_penalty: 0,
  presence_penalty: 0,
  seed: null,
  stream: true,
}

const allDisabled: ParameterEnabled = {
  temperature: false,
  top_p: false,
  max_tokens: false,
  frequency_penalty: false,
  presence_penalty: false,
  seed: false,
}

const allEnabled: ParameterEnabled = {
  temperature: true,
  top_p: true,
  max_tokens: true,
  frequency_penalty: true,
  presence_penalty: true,
  seed: true,
}

describe('buildChatCompletionPayload', () => {
  test('builds basic payload with no optional parameters', () => {
    const messages = [makeMessage('user', 'hello')]
    const payload = buildChatCompletionPayload(messages, baseConfig, allDisabled)

    expect(payload.model).toBe('gpt-4o')
    expect(payload.group).toBe('default')
    expect(payload.stream).toBe(true)
    expect(payload.messages).toEqual([{ role: 'user', content: 'hello' }])
    expect(payload.temperature).toBeUndefined()
    expect(payload.top_p).toBeUndefined()
    expect(payload.max_tokens).toBeUndefined()
    expect(payload.frequency_penalty).toBeUndefined()
    expect(payload.presence_penalty).toBeUndefined()
    expect(payload.seed).toBeUndefined()
  })

  test('includes all parameters when all are enabled', () => {
    const config = { ...baseConfig, seed: 42 }
    const messages = [makeMessage('user', 'hi')]
    const payload = buildChatCompletionPayload(messages, config, allEnabled)

    expect(payload.temperature).toBe(0.7)
    expect(payload.top_p).toBe(1)
    expect(payload.max_tokens).toBe(4096)
    expect(payload.frequency_penalty).toBe(0)
    expect(payload.presence_penalty).toBe(0)
    expect(payload.seed).toBe(42)
  })

  test('does not include seed when seed is null even if enabled', () => {
    const messages = [makeMessage('user', 'hi')]
    const payload = buildChatCompletionPayload(messages, baseConfig, allEnabled)
    expect(payload.seed).toBeUndefined()
  })

  test('filters out invalid messages', () => {
    const messages = [
      makeMessage('user', 'question'),
      makeMessage('assistant', ''),
      makeMessage('user', 'follow-up'),
    ]
    const payload = buildChatCompletionPayload(messages, baseConfig, allDisabled)
    expect(payload.messages).toHaveLength(2)
    expect(payload.messages[0].content).toBe('question')
    expect(payload.messages[1].content).toBe('follow-up')
  })

  test('formats messages correctly', () => {
    const messages = [
      makeMessage('system', 'You are helpful'),
      makeMessage('user', 'What is AI?'),
      makeMessage('assistant', 'AI is...'),
      makeMessage('user', 'Tell me more'),
    ]
    const payload = buildChatCompletionPayload(messages, baseConfig, allDisabled)
    expect(payload.messages).toEqual([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'What is AI?' },
      { role: 'assistant', content: 'AI is...' },
      { role: 'user', content: 'Tell me more' },
    ])
  })

  test('respects individual parameter toggles', () => {
    const messages = [makeMessage('user', 'hi')]
    const partial: ParameterEnabled = {
      temperature: true,
      top_p: false,
      max_tokens: true,
      frequency_penalty: false,
      presence_penalty: true,
      seed: false,
    }
    const payload = buildChatCompletionPayload(messages, baseConfig, partial)
    expect(payload.temperature).toBe(0.7)
    expect(payload.top_p).toBeUndefined()
    expect(payload.max_tokens).toBe(4096)
    expect(payload.frequency_penalty).toBeUndefined()
    expect(payload.presence_penalty).toBe(0)
    expect(payload.seed).toBeUndefined()
  })

  test('handles empty messages array', () => {
    const payload = buildChatCompletionPayload([], baseConfig, allDisabled)
    expect(payload.messages).toEqual([])
  })
})

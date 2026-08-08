import {
  completeAssistantTiming,
  startReasoningTiming,
  completeReasoningTiming,
} from './message-timing-utils'
import type { Message } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'assistant',
    versions: [{ id: 'v1', content: '' }],
    ...overrides,
  }
}

describe('completeAssistantTiming', () => {
  test('sets timing fields for assistant message', () => {
    const msg = makeMessage({ startedAt: 1000 })
    const result = completeAssistantTiming(msg, 2000)
    expect(result.startedAt).toBe(1000)
    expect(result.completedAt).toBe(2000)
    expect(result.durationMs).toBe(1000)
  })

  test('returns message unchanged for user message', () => {
    const msg = makeMessage({ from: 'user', startedAt: 1000 })
    const result = completeAssistantTiming(msg, 2000)
    expect(result).toBe(msg)
  })

  test('uses createdAt as fallback for startedAt', () => {
    const msg = makeMessage({ createdAt: 500 })
    const result = completeAssistantTiming(msg, 1500)
    expect(result.startedAt).toBe(500)
    expect(result.durationMs).toBe(1000)
  })

  test('uses completedAt as fallback when no startedAt or createdAt', () => {
    const msg = makeMessage({})
    const result = completeAssistantTiming(msg, 3000)
    expect(result.startedAt).toBe(3000)
    expect(result.durationMs).toBe(0)
  })

  test('ensures durationMs is never negative', () => {
    const msg = makeMessage({ startedAt: 5000 })
    const result = completeAssistantTiming(msg, 3000)
    expect(result.durationMs).toBe(0)
  })

  test('uses Date.now as default completedAt', () => {
    const msg = makeMessage({ startedAt: 1000 })
    const before = Date.now()
    const result = completeAssistantTiming(msg)
    const after = Date.now()
    expect(result.completedAt).toBeGreaterThanOrEqual(before)
    expect(result.completedAt).toBeLessThanOrEqual(after)
  })
})

describe('startReasoningTiming', () => {
  test('initializes reasoning with defaults when no existing reasoning', () => {
    const msg = makeMessage({})
    const result = startReasoningTiming(msg, 1000)
    expect(result.content).toBe('')
    expect(result.duration).toBe(0)
    expect(result.startedAt).toBe(1000)
  })

  test('preserves existing reasoning content', () => {
    const msg = makeMessage({
      reasoning: { content: 'existing thought', duration: 5 },
    })
    const result = startReasoningTiming(msg, 2000)
    expect(result.content).toBe('existing thought')
    expect(result.duration).toBe(5)
  })

  test('preserves existing startedAt', () => {
    const msg = makeMessage({
      reasoning: { content: '', duration: 0, startedAt: 500 },
    })
    const result = startReasoningTiming(msg, 2000)
    expect(result.startedAt).toBe(500)
  })

  test('uses Date.now as default startedAt', () => {
    const msg = makeMessage({})
    const before = Date.now()
    const result = startReasoningTiming(msg)
    const after = Date.now()
    expect(result.startedAt).toBeGreaterThanOrEqual(before)
    expect(result.startedAt).toBeLessThanOrEqual(after)
  })

  test('preserves completedAt and durationMs from existing reasoning', () => {
    const msg = makeMessage({
      reasoning: {
        content: 'done',
        duration: 2,
        startedAt: 1000,
        completedAt: 3000,
        durationMs: 2000,
      },
    })
    const result = startReasoningTiming(msg, 5000)
    expect(result.completedAt).toBe(3000)
    expect(result.durationMs).toBe(2000)
  })
})

describe('completeReasoningTiming', () => {
  test('sets timing fields for reasoning', () => {
    const msg = makeMessage({
      reasoning: { content: 'thought', duration: 0, startedAt: 1000 },
    })
    const result = completeReasoningTiming(msg, 3000)
    expect(result.reasoning?.startedAt).toBe(1000)
    expect(result.reasoning?.completedAt).toBe(3000)
    expect(result.reasoning?.durationMs).toBe(2000)
    expect(result.reasoning?.duration).toBe(2)
  })

  test('returns message unchanged when no reasoning', () => {
    const msg = makeMessage({})
    const result = completeReasoningTiming(msg, 3000)
    expect(result).toBe(msg)
  })

  test('returns message unchanged when reasoning already has durationMs', () => {
    const msg = makeMessage({
      reasoning: {
        content: 'done',
        duration: 1,
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
      },
    })
    const result = completeReasoningTiming(msg, 5000)
    expect(result).toBe(msg)
  })

  test('uses message startedAt as fallback for reasoning startedAt', () => {
    const msg = makeMessage({
      startedAt: 2000,
      reasoning: { content: 'thought', duration: 0 },
    })
    const result = completeReasoningTiming(msg, 4000)
    expect(result.reasoning?.startedAt).toBe(2000)
    expect(result.reasoning?.durationMs).toBe(2000)
  })

  test('uses completedAt as fallback when no startedAt anywhere', () => {
    const msg = makeMessage({
      reasoning: { content: 'thought', duration: 0 },
    })
    const result = completeReasoningTiming(msg, 5000)
    expect(result.reasoning?.startedAt).toBe(5000)
    expect(result.reasoning?.durationMs).toBe(0)
  })

  test('ensures durationMs is never negative', () => {
    const msg = makeMessage({
      reasoning: { content: 'thought', duration: 0, startedAt: 10000 },
    })
    const result = completeReasoningTiming(msg, 5000)
    expect(result.reasoning?.durationMs).toBe(0)
  })

  test('computes duration as ceiling of seconds', () => {
    const msg = makeMessage({
      reasoning: { content: 'thought', duration: 0, startedAt: 1000 },
    })
    const result = completeReasoningTiming(msg, 2500)
    expect(result.reasoning?.durationMs).toBe(1500)
    expect(result.reasoning?.duration).toBe(2)
  })
})

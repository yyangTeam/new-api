import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'

import { useChatHandler } from '@/features/playground/hooks/use-chat-handler'
import type { Message, PlaygroundConfig, ParameterEnabled } from '@/features/playground/types'
import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED, ERROR_MESSAGES } from '@/features/playground/constants'

const mockSendStreamRequest = vi.fn()
const mockStopStream = vi.fn()
const mockSendChatCompletion = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/features/playground/hooks/use-stream-request', () => ({
  useStreamRequest: () => ({
    sendStreamRequest: mockSendStreamRequest,
    stopStream: mockStopStream,
    isStreaming: false,
  }),
}))

vi.mock('@/features/playground/api', () => ({
  sendChatCompletion: (...args: unknown[]) => mockSendChatCompletion(...args),
}))

vi.mock('@/features/playground/lib', () => ({
  applyStreamingChunk: vi.fn((msg, _type, _chunk) => msg),
  buildChatCompletionPayload: vi.fn((_msgs, _config, _enabled) => ({
    model: 'gpt-4o',
    messages: [],
    stream: true,
  })),
  updateAssistantMessageWithError: vi.fn((msgs) => msgs),
  updateLastAssistantMessage: vi.fn((msgs, updater) => {
    if (msgs.length === 0) return msgs
    const last = msgs[msgs.length - 1]
    if (last.from !== 'assistant') return msgs
    return [...msgs.slice(0, -1), updater(last)]
  }),
  parseRequestErrorDetails: vi.fn(() => ({
    errorCode: 'ERR',
    errorMessage: 'Something failed',
  })),
  applyChatCompletionResponse: vi.fn((msg, _response) => ({
    ...msg,
    versions: [{ id: 'v1', content: 'response' }],
  })),
  completeAssistantMessage: vi.fn((msg) => ({
    ...msg,
    status: 'complete',
  })),
  hasChatCompletionChoice: vi.fn(() => true),
  isAssistantMessageFinal: vi.fn(() => false),
  isAssistantMessagePending: vi.fn(() => true),
}))

describe('useChatHandler', () => {
  let onMessageUpdate: ReturnType<typeof vi.fn>
  const config: PlaygroundConfig = { ...DEFAULT_CONFIG, stream: true }
  const parameterEnabled: ParameterEnabled = { ...DEFAULT_PARAMETER_ENABLED }
  const messages: Message[] = [
    { key: 'user-1', from: 'user', versions: [{ id: 'v1', content: 'hi' }] },
    { key: 'assistant-1', from: 'assistant', versions: [{ id: 'v2', content: '' }] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    onMessageUpdate = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sendChat calls sendStreamRequest in stream mode', () => {
    const { result } = renderHook(() =>
      useChatHandler({ config, parameterEnabled, onMessageUpdate })
    )

    act(() => {
      result.current.sendChat(messages)
    })

    expect(mockSendStreamRequest).toHaveBeenCalled()
  })

  it('sendChat calls sendChatCompletion in non-stream mode', async () => {
    const nonStreamConfig = { ...config, stream: false }
    mockSendChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Hello' } }],
    })

    const { result } = renderHook(() =>
      useChatHandler({ config: nonStreamConfig, parameterEnabled, onMessageUpdate })
    )

    await act(async () => {
      result.current.sendChat(messages)
    })

    expect(mockSendChatCompletion).toHaveBeenCalled()
  })

  it('sendChat in non-stream mode handles error', async () => {
    const nonStreamConfig = { ...config, stream: false }
    mockSendChatCompletion.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() =>
      useChatHandler({ config: nonStreamConfig, parameterEnabled, onMessageUpdate })
    )

    await act(async () => {
      result.current.sendChat(messages)
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('stopGeneration stops stream and aborts', () => {
    const { result } = renderHook(() =>
      useChatHandler({ config, parameterEnabled, onMessageUpdate })
    )

    act(() => {
      result.current.sendChat(messages)
    })

    act(() => {
      result.current.stopGeneration()
    })

    expect(mockStopStream).toHaveBeenCalled()
    expect(result.current.isGenerating).toBe(false)
  })

  it('isGenerating is true during request', () => {
    const { result } = renderHook(() =>
      useChatHandler({ config, parameterEnabled, onMessageUpdate })
    )

    act(() => {
      result.current.sendChat(messages)
    })

    expect(result.current.isGenerating).toBe(true)
  })

  it('stream handlers get called', () => {
    mockSendStreamRequest.mockImplementation(
      (_payload: unknown, onChunk: Function, onComplete: Function) => {
        onChunk('content', 'Hello')
        onComplete()
        return Promise.resolve()
      }
    )

    const { result } = renderHook(() =>
      useChatHandler({ config, parameterEnabled, onMessageUpdate })
    )

    act(() => {
      result.current.sendChat(messages)
    })

    // Flush stream updates
    act(() => { vi.advanceTimersByTime(100) })

    expect(onMessageUpdate).toHaveBeenCalled()
  })

  it('stream error handler shows toast', () => {
    mockSendStreamRequest.mockImplementation(
      (_payload: unknown, _onChunk: Function, _onComplete: Function, onError: Function) => {
        onError('Connection failed', 'ERR_CONN')
        return Promise.resolve()
      }
    )

    const { result } = renderHook(() =>
      useChatHandler({ config, parameterEnabled, onMessageUpdate })
    )

    act(() => {
      result.current.sendChat(messages)
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('non-stream mode handles no choices', async () => {
    const nonStreamConfig = { ...config, stream: false }
    const { hasChatCompletionChoice } = await import('@/features/playground/lib')
    ;(hasChatCompletionChoice as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)
    mockSendChatCompletion.mockResolvedValue({ choices: [] })

    const { result } = renderHook(() =>
      useChatHandler({ config: nonStreamConfig, parameterEnabled, onMessageUpdate })
    )

    await act(async () => {
      result.current.sendChat(messages)
    })

    expect(toast.error).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import type { Message } from '@/features/playground/types'
import { usePlaygroundConversation } from '@/features/playground/hooks/use-playground-conversation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/features/playground/lib', () => ({
  appendUserMessagePair: vi.fn((_msgs: Message[], text: string) => [
    { key: 'user-1', from: 'user', versions: [{ id: 'v1', content: text }] },
    { key: 'assistant-1', from: 'assistant', versions: [{ id: 'v2', content: '' }] },
  ]),
  applyMessageEdit: vi.fn((_msgs: Message[], _key: string, content: string, shouldSubmit: boolean) => ({
    messages: [{ key: 'user-1', from: 'user', versions: [{ id: 'v1', content }] }],
    shouldSend: shouldSubmit,
  })),
  createRegeneratedMessages: vi.fn((_msgs: Message[], _key: string) => [
    { key: 'user-1', from: 'user', versions: [{ id: 'v1', content: 'hi' }] },
    { key: 'assistant-2', from: 'assistant', versions: [{ id: 'v3', content: '' }] },
  ]),
  removeMessageByKey: vi.fn((_msgs: Message[], key: string) =>
    (_msgs as Message[]).filter((m: Message) => m.key !== key)
  ),
}))

describe('usePlaygroundConversation', () => {
  const messages: Message[] = [
    { key: 'user-1', from: 'user', versions: [{ id: 'v1', content: 'hello' }] },
    { key: 'assistant-1', from: 'assistant', versions: [{ id: 'v2', content: 'hi' }] },
  ]
  let updateMessages: ReturnType<typeof vi.fn>
  let sendChat: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    updateMessages = vi.fn()
    sendChat = vi.fn()
  })

  function setup() {
    return renderHook(() =>
      usePlaygroundConversation({ messages, updateMessages, sendChat })
    )
  }

  it('handleSendMessage appends message and sends chat', () => {
    const { result } = setup()

    act(() => { result.current.handleSendMessage('new message') })

    expect(updateMessages).toHaveBeenCalled()
    expect(sendChat).toHaveBeenCalled()
  })

  it('handleRegenerateMessage regenerates and sends chat', () => {
    const { result } = setup()

    act(() => {
      result.current.handleRegenerateMessage(messages[1])
    })

    expect(updateMessages).toHaveBeenCalled()
    expect(sendChat).toHaveBeenCalled()
  })

  it('handleRegenerateMessage does nothing if createRegeneratedMessages returns null', async () => {
    const { createRegeneratedMessages } = await import('@/features/playground/lib')
    ;(createRegeneratedMessages as ReturnType<typeof vi.fn>).mockReturnValueOnce(null)

    const { result } = setup()

    act(() => {
      result.current.handleRegenerateMessage(messages[1])
    })

    expect(updateMessages).not.toHaveBeenCalled()
    expect(sendChat).not.toHaveBeenCalled()
  })

  it('handleEditMessage sets editingMessageKey', () => {
    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })

    expect(result.current.editingMessageKey).toBe('user-1')
  })

  it('handleEditOpenChange(false) clears editingMessageKey', () => {
    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })
    expect(result.current.editingMessageKey).toBe('user-1')

    act(() => { result.current.handleEditOpenChange(false) })
    expect(result.current.editingMessageKey).toBeNull()
  })

  it('handleEditOpenChange(true) does not clear key', () => {
    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })
    act(() => { result.current.handleEditOpenChange(true) })
    expect(result.current.editingMessageKey).toBe('user-1')
  })

  it('applyEdit applies edit and sends if shouldSubmit is true', () => {
    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })
    act(() => { result.current.applyEdit('edited text', true) })

    expect(updateMessages).toHaveBeenCalled()
    expect(sendChat).toHaveBeenCalled()
    expect(result.current.editingMessageKey).toBeNull()
  })

  it('applyEdit applies edit without sending if shouldSubmit is false', () => {
    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })
    act(() => { result.current.applyEdit('edited text', false) })

    expect(updateMessages).toHaveBeenCalled()
    expect(sendChat).not.toHaveBeenCalled()
  })

  it('applyEdit does nothing when no editingMessageKey is set', () => {
    const { result } = setup()

    act(() => { result.current.applyEdit('content', true) })

    expect(updateMessages).not.toHaveBeenCalled()
    expect(sendChat).not.toHaveBeenCalled()
  })

  it('applyEdit does nothing if applyMessageEdit returns null', async () => {
    const { applyMessageEdit } = await import('@/features/playground/lib')
    ;(applyMessageEdit as ReturnType<typeof vi.fn>).mockReturnValueOnce(null)

    const { result } = setup()

    act(() => { result.current.handleEditMessage(messages[0]) })
    act(() => { result.current.applyEdit('text', true) })

    expect(updateMessages).not.toHaveBeenCalled()
  })

  it('handleDeleteMessage removes message', () => {
    const { result } = setup()

    act(() => { result.current.handleDeleteMessage(messages[0]) })

    expect(updateMessages).toHaveBeenCalledWith(expect.any(Function))
  })
})

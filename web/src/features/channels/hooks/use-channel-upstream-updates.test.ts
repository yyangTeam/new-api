import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useChannelUpstreamUpdates } from './use-channel-upstream-updates'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

vi.mock('../lib/upstream-update-utils', () => ({
  normalizeModelList: vi.fn((list: unknown[]) =>
    (list || []).filter((m) => typeof m === 'string' && m.trim() !== '')
  ),
}))

import { toast } from 'sonner'
import { api } from '@/lib/api'

const mockPost = (api as unknown as { post: ReturnType<typeof vi.fn> }).post

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useChannelUpstreamUpdates', () => {
  const refresh = vi.fn().mockResolvedValue(undefined)

  it('initial state has modal closed', () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    expect(result.current.showModal).toBe(false)
    expect(result.current.channel).toBeNull()
    expect(result.current.addModels).toEqual([])
    expect(result.current.removeModels).toEqual([])
    expect(result.current.preferredTab).toBe('add')
    expect(result.current.applyLoading).toBe(false)
    expect(result.current.detectAllLoading).toBe(false)
    expect(result.current.applyAllLoading).toBe(false)
  })

  it('openModal shows toast.info when record is null', () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal(null, ['model-a'], ['model-b'])
    })
    expect(toast.info).toHaveBeenCalled()
    expect(result.current.showModal).toBe(false)
  })

  it('openModal shows toast.info when no add/remove models', () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, [], [])
    })
    expect(toast.info).toHaveBeenCalled()
    expect(result.current.showModal).toBe(false)
  })

  it('openModal opens modal with valid data', () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, ['gpt-4'], ['gpt-3.5'], 'remove')
    })
    expect(result.current.showModal).toBe(true)
    expect(result.current.channel).toEqual({ id: 1 })
    expect(result.current.addModels).toEqual(['gpt-4'])
    expect(result.current.removeModels).toEqual(['gpt-3.5'])
    expect(result.current.preferredTab).toBe('remove')
  })

  it('closeModal resets state', () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, ['gpt-4'], [])
    })
    expect(result.current.showModal).toBe(true)
    act(() => {
      result.current.closeModal()
    })
    expect(result.current.showModal).toBe(false)
    expect(result.current.channel).toBeNull()
    expect(result.current.addModels).toEqual([])
    expect(result.current.removeModels).toEqual([])
  })

  it('applyUpdates calls API and shows success toast', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          added_models: ['gpt-4'],
          removed_models: [],
          settings: null,
        },
      },
    })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, ['gpt-4', 'gpt-3.5'], [])
    })
    await act(async () => {
      await result.current.applyUpdates({
        addModels: ['gpt-4'],
        removeModels: [],
      })
    })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/channel/upstream_updates/apply',
      expect.objectContaining({ id: 1, add_models: ['gpt-4'] }),
      expect.anything()
    )
    expect(toast.success).toHaveBeenCalled()
    expect(result.current.showModal).toBe(false)
    expect(refresh).toHaveBeenCalled()
  })

  it('applyUpdates shows error on failure', async () => {
    mockPost.mockResolvedValue({ data: { success: false, message: 'err' } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, ['gpt-4'], [])
    })
    await act(async () => {
      await result.current.applyUpdates({ addModels: ['gpt-4'] })
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('applyUpdates handles exception', async () => {
    mockPost.mockRejectedValue({ response: { data: { message: 'server error' } } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    act(() => {
      result.current.openModal({ id: 1 }, ['gpt-4'], [])
    })
    await act(async () => {
      await result.current.applyUpdates({ addModels: ['gpt-4'] })
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('applyUpdates closes modal when no channel', async () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.applyUpdates()
    })
    // Should not call API
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('applyAllUpdates calls API and shows success', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          processed_channels: 5,
          added_models: 3,
          removed_models: 1,
          failed_channel_ids: [],
        },
      },
    })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.applyAllUpdates()
    })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/channel/upstream_updates/apply_all',
      {},
      expect.anything()
    )
    expect(toast.success).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it('applyAllUpdates shows error on failure', async () => {
    mockPost.mockResolvedValue({ data: { success: false, message: 'fail' } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.applyAllUpdates()
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('applyAllUpdates handles exception', async () => {
    mockPost.mockRejectedValue({ message: 'network error' })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.applyAllUpdates()
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('detectChannelUpdates calls API with channel id', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { add_models: ['new-model'], remove_models: [] },
      },
    })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectChannelUpdates({ id: 5 })
    })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/channel/upstream_updates/detect',
      { id: 5 },
      expect.anything()
    )
    expect(toast.success).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it('detectChannelUpdates does nothing for null channel', async () => {
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectChannelUpdates(null)
    })
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('detectChannelUpdates shows error on failure', async () => {
    mockPost.mockResolvedValue({ data: { success: false, message: 'err' } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectChannelUpdates({ id: 1 })
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('detectChannelUpdates handles exception', async () => {
    mockPost.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectChannelUpdates({ id: 1 })
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('detectAllUpdates calls API', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectAllUpdates()
    })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/channel/upstream_updates/detect_all',
      {},
      expect.anything()
    )
    expect(toast.success).toHaveBeenCalled()
  })

  it('detectAllUpdates shows error on failure', async () => {
    mockPost.mockResolvedValue({ data: { success: false } })
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectAllUpdates()
    })
    expect(toast.error).toHaveBeenCalled()
  })

  it('detectAllUpdates handles exception', async () => {
    mockPost.mockRejectedValue(new Error('err'))
    const { result } = renderHook(() => useChannelUpstreamUpdates(refresh))
    await act(async () => {
      await result.current.detectAllUpdates()
    })
    expect(toast.error).toHaveBeenCalled()
  })
})

import { renderHook, act } from '@testing-library/react'

import { useCountdown } from './use-countdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns initial state with defaults', () => {
    const { result } = renderHook(() => useCountdown())
    expect(result.current.secondsLeft).toBe(30)
    expect(result.current.isActive).toBe(false)
  })

  test('returns initial state with custom seconds', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 60 })
    )
    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.isActive).toBe(false)
  })

  test('starts countdown and decrements each second', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 5 })
    )

    act(() => {
      result.current.start()
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.secondsLeft).toBe(5)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.secondsLeft).toBe(4)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.secondsLeft).toBe(3)
  })

  test('resets to initialSeconds and becomes inactive when reaching zero', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 3 })
    )

    act(() => {
      result.current.start()
    })

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.secondsLeft).toBe(3)
    expect(result.current.isActive).toBe(false)
  })

  test('start with custom seconds overrides initialSeconds', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 30 })
    )

    act(() => {
      result.current.start(10)
    })

    expect(result.current.secondsLeft).toBe(10)
    expect(result.current.isActive).toBe(true)
  })

  test('stop halts countdown and sets inactive', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 10 })
    )

    act(() => {
      result.current.start()
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.secondsLeft).toBe(8)

    act(() => {
      result.current.stop()
    })

    expect(result.current.isActive).toBe(false)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.secondsLeft).toBe(8)
  })

  test('reset stops countdown and restores initialSeconds', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 20 })
    )

    act(() => {
      result.current.start()
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.secondsLeft).toBe(15)

    act(() => {
      result.current.reset()
    })

    expect(result.current.secondsLeft).toBe(20)
    expect(result.current.isActive).toBe(false)
  })

  test('autoStart begins countdown immediately', () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 5, autoStart: true })
    )

    expect(result.current.isActive).toBe(true)
  })
})

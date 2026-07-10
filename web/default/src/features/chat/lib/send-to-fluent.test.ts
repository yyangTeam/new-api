import { sendToFluent } from './send-to-fluent'

describe('sendToFluent', () => {
  let dispatchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dispatchSpy = vi.fn()
    const container = document.createElement('div')
    container.id = 'fluent-new-api-container'
    container.dispatchEvent = dispatchSpy
    document.body.appendChild(container)
  })

  afterEach(() => {
    const container = document.getElementById('fluent-new-api-container')
    if (container) {
      document.body.removeChild(container)
    }
  })

  test('returns false when container element is missing', () => {
    const container = document.getElementById('fluent-new-api-container')!
    document.body.removeChild(container)
    expect(sendToFluent('my-api-key')).toBe(false)
  })

  test('returns true when container exists', () => {
    expect(sendToFluent('my-api-key')).toBe(true)
  })

  test('dispatches CustomEvent with correct payload', () => {
    sendToFluent('my-api-key', 'https://api.example.com')

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.type).toBe('fluent:prefill')
    expect(event.detail).toEqual({
      id: 'new-api',
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-my-api-key',
    })
  })

  test('uses window.location.origin when serverAddress is not provided', () => {
    sendToFluent('key123')

    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.detail.baseUrl).toBe(window.location.origin)
  })

  test('prepends sk- to api key', () => {
    sendToFluent('test-key')

    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.detail.apiKey).toBe('sk-test-key')
  })
})

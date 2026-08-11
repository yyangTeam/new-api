import type { HomePageContentResponse, HomePageContentResult } from '@/features/home/types'

describe('HomePageContentResponse type', () => {
  test('can create full response', () => {
    const response: HomePageContentResponse = {
      success: true,
      message: 'ok',
      data: '# Home',
    }
    expect(response.success).toBe(true)
    expect(response.message).toBe('ok')
    expect(response.data).toBe('# Home')
  })

  test('can create response without optional fields', () => {
    const response: HomePageContentResponse = {
      success: false,
    }
    expect(response.success).toBe(false)
    expect(response.message).toBeUndefined()
    expect(response.data).toBeUndefined()
  })
})

describe('HomePageContentResult type', () => {
  test('can create loaded result with content', () => {
    const result: HomePageContentResult = {
      content: '# Welcome',
      isLoaded: true,
      isUrl: false,
    }
    expect(result.content).toBe('# Welcome')
    expect(result.isLoaded).toBe(true)
    expect(result.isUrl).toBe(false)
  })

  test('can create result with URL', () => {
    const result: HomePageContentResult = {
      content: 'https://example.com',
      isLoaded: true,
      isUrl: true,
    }
    expect(result.isUrl).toBe(true)
  })

  test('can create not-loaded result', () => {
    const result: HomePageContentResult = {
      content: '',
      isLoaded: false,
      isUrl: false,
    }
    expect(result.isLoaded).toBe(false)
  })
})

import type { AboutResponse } from '@/features/about/types'

describe('AboutResponse type', () => {
  test('can create valid AboutResponse with all fields', () => {
    const response: AboutResponse = {
      success: true,
      message: 'ok',
      data: '# About',
    }
    expect(response.success).toBe(true)
    expect(response.message).toBe('ok')
    expect(response.data).toBe('# About')
  })

  test('can create AboutResponse without optional data field', () => {
    const response: AboutResponse = {
      success: false,
      message: 'not found',
    }
    expect(response.success).toBe(false)
    expect(response.data).toBeUndefined()
  })
})

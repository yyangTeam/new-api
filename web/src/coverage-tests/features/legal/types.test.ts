import type { LegalDocumentResponse } from '@/features/legal/types'

describe('LegalDocumentResponse type', () => {
  test('can create valid response with all fields', () => {
    const response: LegalDocumentResponse = {
      success: true,
      message: 'ok',
      data: '# Policy',
    }
    expect(response.success).toBe(true)
    expect(response.message).toBe('ok')
    expect(response.data).toBe('# Policy')
  })

  test('can create response without optional fields', () => {
    const response: LegalDocumentResponse = {
      success: false,
    }
    expect(response.success).toBe(false)
    expect(response.message).toBeUndefined()
    expect(response.data).toBeUndefined()
  })
})

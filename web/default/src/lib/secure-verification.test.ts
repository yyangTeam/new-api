import {
  isVerificationRequiredError,
  extractVerificationInfo,
} from './secure-verification'

describe('isVerificationRequiredError', () => {
  test('returns false for null', () => {
    expect(isVerificationRequiredError(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isVerificationRequiredError(undefined)).toBe(false)
  })

  test('returns false for non-object', () => {
    expect(isVerificationRequiredError('error')).toBe(false)
    expect(isVerificationRequiredError(42)).toBe(false)
  })

  test('returns false when response status is not 403', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'VERIFICATION_REQUIRED' },
      },
    }
    expect(isVerificationRequiredError(error)).toBe(false)
  })

  test('returns false when response is missing', () => {
    const error = {}
    expect(isVerificationRequiredError(error)).toBe(false)
  })

  test('returns false when code is missing', () => {
    const error = {
      response: {
        status: 403,
        data: {},
      },
    }
    expect(isVerificationRequiredError(error)).toBe(false)
  })

  test('returns false for unrecognized code', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'ACCESS_DENIED' },
      },
    }
    expect(isVerificationRequiredError(error)).toBe(false)
  })

  test('returns true for VERIFICATION_REQUIRED', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_REQUIRED' },
      },
    }
    expect(isVerificationRequiredError(error)).toBe(true)
  })

  test('returns true for VERIFICATION_EXPIRED', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_EXPIRED' },
      },
    }
    expect(isVerificationRequiredError(error)).toBe(true)
  })

  test('returns true for VERIFICATION_INVALID', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_INVALID' },
      },
    }
    expect(isVerificationRequiredError(error)).toBe(true)
  })
})

describe('extractVerificationInfo', () => {
  test('extracts code and message from error response', () => {
    const error = {
      response: {
        data: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Please verify your identity',
        },
      },
    }
    const info = extractVerificationInfo(error)
    expect(info.code).toBe('VERIFICATION_REQUIRED')
    expect(info.message).toBe('Please verify your identity')
    expect(info.required).toBe(true)
  })

  test('uses default message when message is missing', () => {
    const error = {
      response: {
        data: {
          code: 'VERIFICATION_EXPIRED',
        },
      },
    }
    const info = extractVerificationInfo(error)
    expect(info.code).toBe('VERIFICATION_EXPIRED')
    expect(info.message).toBe('Secure verification is required')
    expect(info.required).toBe(true)
  })

  test('handles missing response data gracefully', () => {
    const error = {}
    const info = extractVerificationInfo(error)
    expect(info.code).toBeUndefined()
    expect(info.message).toBe('Secure verification is required')
    expect(info.required).toBe(true)
  })
})

import { ERROR_MESSAGES } from '../../constants'

import { parseRequestErrorDetails } from './request-error-utils'

describe('parseRequestErrorDetails', () => {
  test('extracts error code and message from response data', () => {
    const error = {
      response: {
        data: {
          error: { code: 'rate_limit_exceeded' },
          message: 'Rate limit reached',
        },
      },
    }
    const result = parseRequestErrorDetails(error)
    expect(result.errorCode).toBe('rate_limit_exceeded')
    expect(result.errorMessage).toBe('Rate limit reached')
  })

  test('falls back to error.message when no response data', () => {
    const error = { message: 'Network error' }
    const result = parseRequestErrorDetails(error)
    expect(result.errorCode).toBeUndefined()
    expect(result.errorMessage).toBe('Network error')
  })

  test('falls back to default message when no messages available', () => {
    const result = parseRequestErrorDetails({})
    expect(result.errorCode).toBeUndefined()
    expect(result.errorMessage).toBe(ERROR_MESSAGES.API_REQUEST_ERROR)
  })

  test('handles null error', () => {
    const result = parseRequestErrorDetails(null)
    expect(result.errorMessage).toBe(ERROR_MESSAGES.API_REQUEST_ERROR)
  })

  test('handles undefined error', () => {
    const result = parseRequestErrorDetails(undefined)
    expect(result.errorMessage).toBe(ERROR_MESSAGES.API_REQUEST_ERROR)
  })

  test('errorCode is undefined when error.code is empty string', () => {
    const error = {
      response: {
        data: {
          error: { code: '' },
          message: 'Some error',
        },
      },
    }
    const result = parseRequestErrorDetails(error)
    expect(result.errorCode).toBeUndefined()
  })

  test('prefers response.data.message over error.message', () => {
    const error = {
      message: 'Generic error',
      response: {
        data: {
          message: 'Specific API error',
        },
      },
    }
    const result = parseRequestErrorDetails(error)
    expect(result.errorMessage).toBe('Specific API error')
  })
})

import { AxiosError, AxiosHeaders } from 'axios'
import { handleServerError } from './handle-server-error'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
  },
}))

import { toast } from 'sonner'

describe('handleServerError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows generic error message for unknown error types', () => {
    handleServerError('some string error')
    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })

  test('shows generic error message for plain Error', () => {
    handleServerError(new Error('something broke'))
    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })

  test('shows content not found for 204 status', () => {
    handleServerError({ status: 204 })
    expect(toast.error).toHaveBeenCalledWith('Content not found.')
  })

  test('shows content not found for 204 status as string', () => {
    handleServerError({ status: '204' })
    expect(toast.error).toHaveBeenCalledWith('Content not found.')
  })

  test('shows AxiosError response title when available', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      data: { title: 'Unauthorized Access' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
    handleServerError(error)
    expect(toast.error).toHaveBeenCalledWith('Unauthorized Access')
  })

  test('AxiosError takes precedence over 204 status check', () => {
    const error = new AxiosError('Request failed')
    Object.assign(error, { status: 204 })
    error.response = {
      data: { title: 'Specific Error' },
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
    handleServerError(error)
    expect(toast.error).toHaveBeenCalledWith('Specific Error')
  })

  test('handles null error', () => {
    handleServerError(null)
    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })

  test('handles undefined error', () => {
    handleServerError(undefined)
    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })

  test('handles AxiosError without response', () => {
    const error = new AxiosError('Network Error')
    handleServerError(error)
    expect(toast.error).toHaveBeenCalledWith(undefined)
  })

  test('shows generic error for non-204 status objects', () => {
    handleServerError({ status: 500 })
    expect(toast.error).toHaveBeenCalledWith('Something went wrong!')
  })
})

import {
  parseStreamErrorDetails,
  parseStreamMessageUpdates,
  isStreamDoneMessage,
  isStreamClosedReadyState,
  getStreamReadyStateError,
} from './stream-utils'

describe('parseStreamErrorDetails', () => {
  test('returns fallback message when data is undefined', () => {
    const result = parseStreamErrorDetails(undefined)
    expect(result.errorMessage).toBe('Request error occurred')
    expect(result.errorCode).toBeUndefined()
  })

  test('returns fallback message when data is empty string', () => {
    const result = parseStreamErrorDetails('')
    expect(result.errorMessage).toBe('Request error occurred')
  })

  test('returns data as fallback message when JSON is invalid', () => {
    const result = parseStreamErrorDetails('not json')
    expect(result.errorMessage).toBe('not json')
    expect(result.errorCode).toBeUndefined()
  })

  test('returns data as fallback when parsed but no error field', () => {
    const result = parseStreamErrorDetails('{"status": "ok"}')
    expect(result.errorMessage).toBe('{"status": "ok"}')
  })

  test('extracts error code and message from valid error payload', () => {
    const data = JSON.stringify({
      error: { code: 'rate_limit', message: 'Too many requests' },
    })
    const result = parseStreamErrorDetails(data)
    expect(result.errorCode).toBe('rate_limit')
    expect(result.errorMessage).toBe('Too many requests')
  })

  test('uses fallback message when error message is empty', () => {
    const data = JSON.stringify({ error: { code: 'err', message: '' } })
    const result = parseStreamErrorDetails(data)
    expect(result.errorCode).toBe('err')
    expect(result.errorMessage).toBe(data)
  })

  test('sets errorCode to undefined when code is empty', () => {
    const data = JSON.stringify({ error: { code: '', message: 'fail' } })
    const result = parseStreamErrorDetails(data)
    expect(result.errorCode).toBeUndefined()
    expect(result.errorMessage).toBe('fail')
  })
})

describe('parseStreamMessageUpdates', () => {
  test('returns empty array when no delta', () => {
    const data = JSON.stringify({ choices: [{}] })
    expect(parseStreamMessageUpdates(data)).toEqual([])
  })

  test('returns empty array when choices is empty', () => {
    const data = JSON.stringify({ choices: [] })
    expect(parseStreamMessageUpdates(data)).toEqual([])
  })

  test('returns content update', () => {
    const data = JSON.stringify({
      choices: [{ delta: { content: 'hello' } }],
    })
    expect(parseStreamMessageUpdates(data)).toEqual([
      { type: 'content', chunk: 'hello' },
    ])
  })

  test('returns reasoning update', () => {
    const data = JSON.stringify({
      choices: [{ delta: { reasoning_content: 'thinking...' } }],
    })
    expect(parseStreamMessageUpdates(data)).toEqual([
      { type: 'reasoning', chunk: 'thinking...' },
    ])
  })

  test('returns both reasoning and content updates', () => {
    const data = JSON.stringify({
      choices: [
        { delta: { reasoning_content: 'thought', content: 'answer' } },
      ],
    })
    const updates = parseStreamMessageUpdates(data)
    expect(updates).toHaveLength(2)
    expect(updates[0]).toEqual({ type: 'reasoning', chunk: 'thought' })
    expect(updates[1]).toEqual({ type: 'content', chunk: 'answer' })
  })

  test('skips empty content fields', () => {
    const data = JSON.stringify({
      choices: [{ delta: { content: '', reasoning_content: '' } }],
    })
    expect(parseStreamMessageUpdates(data)).toEqual([])
  })
})

describe('isStreamDoneMessage', () => {
  test('returns true for [DONE]', () => {
    expect(isStreamDoneMessage('[DONE]')).toBe(true)
  })

  test('returns false for other strings', () => {
    expect(isStreamDoneMessage('[done]')).toBe(false)
    expect(isStreamDoneMessage('DONE')).toBe(false)
    expect(isStreamDoneMessage('')).toBe(false)
  })
})

describe('isStreamClosedReadyState', () => {
  test('returns true for readyState 2', () => {
    expect(isStreamClosedReadyState(2)).toBe(true)
  })

  test('returns false for other values', () => {
    expect(isStreamClosedReadyState(0)).toBe(false)
    expect(isStreamClosedReadyState(1)).toBe(false)
    expect(isStreamClosedReadyState(3)).toBe(false)
    expect(isStreamClosedReadyState(undefined)).toBe(false)
  })
})

describe('getStreamReadyStateError', () => {
  test('returns error string when readyState >= 2 and status is not 200', () => {
    const result = getStreamReadyStateError(2, { status: 500 })
    expect(result).toBe('HTTP 500: Connection closed')
  })

  test('returns null when readyState < 2', () => {
    expect(getStreamReadyStateError(1, { status: 500 })).toBeNull()
  })

  test('returns null when status is 200', () => {
    expect(getStreamReadyStateError(2, { status: 200 })).toBeNull()
  })

  test('returns null when readyState is undefined', () => {
    expect(getStreamReadyStateError(undefined, { status: 500 })).toBeNull()
  })

  test('returns null when status is undefined', () => {
    expect(getStreamReadyStateError(2, {})).toBeNull()
  })

  test('returns error for readyState > 2', () => {
    const result = getStreamReadyStateError(3, { status: 429 })
    expect(result).toBe('HTTP 429: Connection closed')
  })
})

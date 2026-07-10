import {
  base64UrlToArrayBuffer,
  arrayBufferToBase64Url,
  prepareCredentialCreationOptions,
  prepareCredentialRequestOptions,
} from './passkey'

describe('base64UrlToArrayBuffer', () => {
  test('returns empty ArrayBuffer for null', () => {
    const result = base64UrlToArrayBuffer(null)
    expect(result.byteLength).toBe(0)
  })

  test('returns empty ArrayBuffer for undefined', () => {
    const result = base64UrlToArrayBuffer(undefined)
    expect(result.byteLength).toBe(0)
  })

  test('returns empty ArrayBuffer for empty string', () => {
    const result = base64UrlToArrayBuffer('')
    expect(result.byteLength).toBe(0)
  })

  test('decodes a base64url string to correct bytes', () => {
    const result = base64UrlToArrayBuffer('AQID')
    const bytes = new Uint8Array(result)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('handles base64url characters (- and _)', () => {
    const base64url = 'ab-c_d'
    const result = base64UrlToArrayBuffer(base64url)
    expect(result.byteLength).toBeGreaterThan(0)
  })

  test('handles missing padding', () => {
    const result1 = base64UrlToArrayBuffer('YQ')
    expect(new Uint8Array(result1)).toEqual(new Uint8Array([97]))

    const result2 = base64UrlToArrayBuffer('YWI')
    expect(new Uint8Array(result2)).toEqual(new Uint8Array([97, 98]))
  })
})

describe('arrayBufferToBase64Url', () => {
  test('returns empty string for null', () => {
    expect(arrayBufferToBase64Url(null)).toBe('')
  })

  test('returns empty string for undefined', () => {
    expect(arrayBufferToBase64Url(undefined)).toBe('')
  })

  test('encodes bytes to base64url', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const result = arrayBufferToBase64Url(buffer)
    expect(result).toBe('AQID')
  })

  test('does not contain +, /, or = characters', () => {
    const buffer = new Uint8Array([255, 254, 253, 252, 251, 250]).buffer
    const result = arrayBufferToBase64Url(buffer)
    expect(result).not.toMatch(/[+/=]/)
  })

  test('encodes empty buffer to empty string', () => {
    const buffer = new ArrayBuffer(0)
    expect(arrayBufferToBase64Url(buffer)).toBe('')
  })
})

describe('base64url roundtrip', () => {
  test('roundtrips correctly', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255])
    const encoded = arrayBufferToBase64Url(original.buffer)
    const decoded = base64UrlToArrayBuffer(encoded)
    expect(new Uint8Array(decoded)).toEqual(original)
  })

  test('roundtrips a longer payload', () => {
    const original = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      original[i] = i
    }
    const encoded = arrayBufferToBase64Url(original.buffer)
    const decoded = base64UrlToArrayBuffer(encoded)
    expect(new Uint8Array(decoded)).toEqual(original)
  })
})

describe('prepareCredentialCreationOptions', () => {
  test('converts challenge and user.id from base64url to ArrayBuffer', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        user: {
          id: 'BAUG',
          name: 'test@example.com',
          displayName: 'Test User',
        },
        rp: { name: 'Example' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      },
    }

    const result = prepareCredentialCreationOptions(payload)
    expect(result.challenge).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(result.challenge as ArrayBuffer)).toEqual(
      new Uint8Array([1, 2, 3])
    )
    expect(result.user.id).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(result.user.id as ArrayBuffer)).toEqual(
      new Uint8Array([4, 5, 6])
    )
  })

  test('converts excludeCredentials ids', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        user: { id: 'BAUG', name: 'test', displayName: 'test' },
        rp: { name: 'Example' },
        pubKeyCredParams: [],
        excludeCredentials: [
          { id: 'BwgJ', type: 'public-key' },
          { id: 'CgsM', type: 'public-key' },
        ],
      },
    }

    const result = prepareCredentialCreationOptions(payload)
    expect(result.excludeCredentials).toHaveLength(2)
    expect(
      new Uint8Array(result.excludeCredentials![0].id as ArrayBuffer)
    ).toEqual(new Uint8Array([7, 8, 9]))
    expect(
      new Uint8Array(result.excludeCredentials![1].id as ArrayBuffer)
    ).toEqual(new Uint8Array([10, 11, 12]))
  })

  test('removes empty attestationFormats array', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        user: { id: 'BAUG', name: 'test', displayName: 'test' },
        rp: { name: 'Example' },
        pubKeyCredParams: [],
        attestationFormats: [],
      },
    }

    const result = prepareCredentialCreationOptions(payload) as any
    expect(result.attestationFormats).toBeUndefined()
  })

  test('keeps non-empty attestationFormats', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        user: { id: 'BAUG', name: 'test', displayName: 'test' },
        rp: { name: 'Example' },
        pubKeyCredParams: [],
        attestationFormats: ['packed'],
      },
    }

    const result = prepareCredentialCreationOptions(payload) as any
    expect(result.attestationFormats).toEqual(['packed'])
  })

  test('accepts PublicKey (capitalized) key', () => {
    const payload = {
      PublicKey: {
        challenge: 'AQID',
        user: { id: 'BAUG', name: 'test', displayName: 'test' },
        rp: { name: 'Example' },
        pubKeyCredParams: [],
      },
    }

    const result = prepareCredentialCreationOptions(payload)
    expect(result.challenge).toBeInstanceOf(ArrayBuffer)
  })

  test('accepts response key', () => {
    const payload = {
      response: {
        challenge: 'AQID',
        user: { id: 'BAUG', name: 'test', displayName: 'test' },
        rp: { name: 'Example' },
        pubKeyCredParams: [],
      },
    }

    const result = prepareCredentialCreationOptions(payload)
    expect(result.challenge).toBeInstanceOf(ArrayBuffer)
  })

  test('throws when no recognized key is found', () => {
    expect(() => prepareCredentialCreationOptions({})).toThrow(
      'Unable to parse Passkey registration options from response'
    )
  })

  test('throws for null payload', () => {
    expect(() => prepareCredentialCreationOptions(null)).toThrow()
  })
})

describe('prepareCredentialRequestOptions', () => {
  test('converts challenge from base64url to ArrayBuffer', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        rpId: 'example.com',
        timeout: 60000,
      },
    }

    const result = prepareCredentialRequestOptions(payload)
    expect(result.challenge).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(result.challenge as ArrayBuffer)).toEqual(
      new Uint8Array([1, 2, 3])
    )
  })

  test('converts allowCredentials ids', () => {
    const payload = {
      publicKey: {
        challenge: 'AQID',
        allowCredentials: [
          { id: 'BwgJ', type: 'public-key' },
        ],
      },
    }

    const result = prepareCredentialRequestOptions(payload)
    expect(result.allowCredentials).toHaveLength(1)
    expect(
      new Uint8Array(result.allowCredentials![0].id as ArrayBuffer)
    ).toEqual(new Uint8Array([7, 8, 9]))
  })

  test('accepts Response key', () => {
    const payload = {
      Response: {
        challenge: 'AQID',
      },
    }

    const result = prepareCredentialRequestOptions(payload)
    expect(result.challenge).toBeInstanceOf(ArrayBuffer)
  })

  test('throws when no recognized key is found', () => {
    expect(() => prepareCredentialRequestOptions({})).toThrow(
      'Unable to parse Passkey login options from response'
    )
  })
})

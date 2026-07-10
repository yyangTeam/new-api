import {
  base64UrlToBuffer,
  bufferToBase64Url,
  prepareCredentialCreationOptions,
  prepareCredentialRequestOptions,
  buildRegistrationResult,
  buildAssertionResult,
  isPasskeySupported,
} from './passkey';

describe('base64UrlToBuffer', () => {
  test('returns empty ArrayBuffer for falsy input', () => {
    expect(base64UrlToBuffer(null).byteLength).toBe(0);
    expect(base64UrlToBuffer(undefined).byteLength).toBe(0);
    expect(base64UrlToBuffer('').byteLength).toBe(0);
  });

  test('decodes a simple base64url string', () => {
    const encoded = bufferToBase64Url(new Uint8Array([72, 101, 108, 108, 111]).buffer);
    const buffer = base64UrlToBuffer(encoded);
    const arr = new Uint8Array(buffer);
    expect(arr[0]).toBe(72);
    expect(arr[1]).toBe(101);
    expect(arr[2]).toBe(108);
    expect(arr[3]).toBe(108);
    expect(arr[4]).toBe(111);
  });

  test('handles base64url with - and _ characters', () => {
    const original = new Uint8Array([255, 254, 253, 252, 251]);
    const encoded = bufferToBase64Url(original.buffer);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    const decoded = new Uint8Array(base64UrlToBuffer(encoded));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});

describe('bufferToBase64Url', () => {
  test('returns empty string for falsy input', () => {
    expect(bufferToBase64Url(null)).toBe('');
    expect(bufferToBase64Url(undefined)).toBe('');
  });

  test('encodes a buffer to base64url without padding', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const result = bufferToBase64Url(buffer);
    expect(result).not.toMatch(/=$/);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  test('roundtrips correctly', () => {
    const original = new Uint8Array([0, 128, 255, 1, 63, 62]);
    const encoded = bufferToBase64Url(original.buffer);
    const decoded = new Uint8Array(base64UrlToBuffer(encoded));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  test('handles empty buffer', () => {
    const buffer = new Uint8Array([]).buffer;
    const result = bufferToBase64Url(buffer);
    expect(result).toBe('');
  });
});

describe('prepareCredentialCreationOptions', () => {
  test('throws when no options can be extracted', () => {
    expect(() => prepareCredentialCreationOptions({})).toThrow();
    expect(() => prepareCredentialCreationOptions(null)).toThrow();
  });

  test('extracts from publicKey field', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([1, 2, 3]).buffer);
    const userIdB64 = bufferToBase64Url(new Uint8Array([4, 5]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        user: { id: userIdB64, name: 'test' },
        rp: { name: 'test-rp' },
      },
    };
    const result = prepareCredentialCreationOptions(payload);
    expect(result.challenge).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result.challenge)).toEqual(new Uint8Array([1, 2, 3]));
    expect(new Uint8Array(result.user.id)).toEqual(new Uint8Array([4, 5]));
    expect(result.rp.name).toBe('test-rp');
  });

  test('extracts from Response field', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([10]).buffer);
    const userIdB64 = bufferToBase64Url(new Uint8Array([20]).buffer);
    const payload = {
      Response: {
        challenge: challengeB64,
        user: { id: userIdB64 },
      },
    };
    const result = prepareCredentialCreationOptions(payload);
    expect(new Uint8Array(result.challenge)).toEqual(new Uint8Array([10]));
  });

  test('converts excludeCredentials ids', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([1]).buffer);
    const userIdB64 = bufferToBase64Url(new Uint8Array([2]).buffer);
    const credIdB64 = bufferToBase64Url(new Uint8Array([3, 4]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        user: { id: userIdB64 },
        excludeCredentials: [{ id: credIdB64, type: 'public-key' }],
      },
    };
    const result = prepareCredentialCreationOptions(payload);
    expect(result.excludeCredentials).toHaveLength(1);
    expect(new Uint8Array(result.excludeCredentials[0].id)).toEqual(new Uint8Array([3, 4]));
  });

  test('removes empty attestationFormats array', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([1]).buffer);
    const userIdB64 = bufferToBase64Url(new Uint8Array([2]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        user: { id: userIdB64 },
        attestationFormats: [],
      },
    };
    const result = prepareCredentialCreationOptions(payload);
    expect(result.attestationFormats).toBeUndefined();
  });

  test('preserves non-empty attestationFormats', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([1]).buffer);
    const userIdB64 = bufferToBase64Url(new Uint8Array([2]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        user: { id: userIdB64 },
        attestationFormats: ['packed'],
      },
    };
    const result = prepareCredentialCreationOptions(payload);
    expect(result.attestationFormats).toEqual(['packed']);
  });
});

describe('prepareCredentialRequestOptions', () => {
  test('throws when no options can be extracted', () => {
    expect(() => prepareCredentialRequestOptions({})).toThrow();
  });

  test('converts challenge to buffer', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([7, 8, 9]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        timeout: 60000,
      },
    };
    const result = prepareCredentialRequestOptions(payload);
    expect(new Uint8Array(result.challenge)).toEqual(new Uint8Array([7, 8, 9]));
    expect(result.timeout).toBe(60000);
  });

  test('converts allowCredentials ids', () => {
    const challengeB64 = bufferToBase64Url(new Uint8Array([1]).buffer);
    const credIdB64 = bufferToBase64Url(new Uint8Array([10, 11]).buffer);
    const payload = {
      publicKey: {
        challenge: challengeB64,
        allowCredentials: [{ id: credIdB64, type: 'public-key' }],
      },
    };
    const result = prepareCredentialRequestOptions(payload);
    expect(result.allowCredentials).toHaveLength(1);
    expect(new Uint8Array(result.allowCredentials[0].id)).toEqual(new Uint8Array([10, 11]));
  });
});

describe('buildRegistrationResult', () => {
  test('returns null for falsy input', () => {
    expect(buildRegistrationResult(null)).toBeNull();
    expect(buildRegistrationResult(undefined)).toBeNull();
  });

  test('builds result from credential object', () => {
    const rawId = new Uint8Array([1, 2, 3]).buffer;
    const attestationObject = new Uint8Array([4, 5]).buffer;
    const clientDataJSON = new Uint8Array([6, 7]).buffer;
    const credential = {
      id: 'test-id',
      rawId,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response: {
        attestationObject,
        clientDataJSON,
        getTransports: () => ['internal'],
      },
      getClientExtensionResults: () => ({ credProps: true }),
    };
    const result = buildRegistrationResult(credential);
    expect(result.id).toBe('test-id');
    expect(result.rawId).toBe(bufferToBase64Url(rawId));
    expect(result.type).toBe('public-key');
    expect(result.response.transports).toEqual(['internal']);
    expect(result.response.attestationObject).toBe(bufferToBase64Url(attestationObject));
    expect(result.response.clientDataJSON).toBe(bufferToBase64Url(clientDataJSON));
    expect(result.clientExtensionResults).toEqual({ credProps: true });
  });

  test('handles missing getTransports', () => {
    const credential = {
      id: 'id',
      rawId: new Uint8Array([1]).buffer,
      type: 'public-key',
      response: {
        attestationObject: new Uint8Array([2]).buffer,
        clientDataJSON: new Uint8Array([3]).buffer,
      },
    };
    const result = buildRegistrationResult(credential);
    expect(result.response.transports).toBeUndefined();
  });
});

describe('buildAssertionResult', () => {
  test('returns null for falsy input', () => {
    expect(buildAssertionResult(null)).toBeNull();
  });

  test('builds result from assertion object', () => {
    const rawId = new Uint8Array([10]).buffer;
    const authenticatorData = new Uint8Array([20]).buffer;
    const clientDataJSON = new Uint8Array([30]).buffer;
    const signature = new Uint8Array([40]).buffer;
    const userHandle = new Uint8Array([50]).buffer;
    const assertion = {
      id: 'assert-id',
      rawId,
      type: 'public-key',
      authenticatorAttachment: 'cross-platform',
      response: {
        authenticatorData,
        clientDataJSON,
        signature,
        userHandle,
      },
      getClientExtensionResults: () => ({}),
    };
    const result = buildAssertionResult(assertion);
    expect(result.id).toBe('assert-id');
    expect(result.rawId).toBe(bufferToBase64Url(rawId));
    expect(result.response.authenticatorData).toBe(bufferToBase64Url(authenticatorData));
    expect(result.response.signature).toBe(bufferToBase64Url(signature));
    expect(result.response.userHandle).toBe(bufferToBase64Url(userHandle));
  });

  test('sets userHandle to null when absent', () => {
    const assertion = {
      id: 'id',
      rawId: new Uint8Array([1]).buffer,
      type: 'public-key',
      response: {
        authenticatorData: new Uint8Array([2]).buffer,
        clientDataJSON: new Uint8Array([3]).buffer,
        signature: new Uint8Array([4]).buffer,
        userHandle: null,
      },
      getClientExtensionResults: () => ({}),
    };
    const result = buildAssertionResult(assertion);
    expect(result.response.userHandle).toBeNull();
  });
});

describe('isPasskeySupported', () => {
  const originalPublicKeyCredential = window.PublicKeyCredential;

  afterEach(() => {
    window.PublicKeyCredential = originalPublicKeyCredential;
  });

  test('returns false when PublicKeyCredential is not available', async () => {
    delete window.PublicKeyCredential;
    expect(await isPasskeySupported()).toBe(false);
  });

  test('returns true when conditional mediation is available', async () => {
    window.PublicKeyCredential = {
      isConditionalMediationAvailable: () => Promise.resolve(true),
    };
    expect(await isPasskeySupported()).toBe(true);
  });

  test('falls back to platform authenticator check', async () => {
    window.PublicKeyCredential = {
      isConditionalMediationAvailable: () => Promise.resolve(false),
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true),
    };
    expect(await isPasskeySupported()).toBe(true);
  });

  test('returns false when platform authenticator is not available', async () => {
    window.PublicKeyCredential = {
      isConditionalMediationAvailable: () => Promise.resolve(false),
      isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(false),
    };
    expect(await isPasskeySupported()).toBe(false);
  });

  test('returns true when no checks are available but PublicKeyCredential exists', async () => {
    window.PublicKeyCredential = {};
    expect(await isPasskeySupported()).toBe(true);
  });
});

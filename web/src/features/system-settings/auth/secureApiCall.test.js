import {
  isVerificationRequiredError,
  extractVerificationInfo,
} from './secureApiCall';

describe('isVerificationRequiredError', () => {
  test('returns false when error has no response', () => {
    expect(isVerificationRequiredError({})).toBe(false);
    expect(isVerificationRequiredError({ message: 'fail' })).toBe(false);
  });

  test('returns false when status is not 403', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'VERIFICATION_REQUIRED' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(false);
  });

  test('returns false when status is 403 but data is falsy', () => {
    const error = {
      response: { status: 403, data: null },
    };
    expect(isVerificationRequiredError(error)).toBe(false);
  });

  test('returns false when status is 403 but code is not a verification code', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'ACCESS_DENIED' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(false);
  });

  test('returns true for VERIFICATION_REQUIRED code', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_REQUIRED' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(true);
  });

  test('returns true for VERIFICATION_EXPIRED code', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_EXPIRED' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(true);
  });

  test('returns true for VERIFICATION_INVALID code', () => {
    const error = {
      response: {
        status: 403,
        data: { code: 'VERIFICATION_INVALID' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(true);
  });

  test('returns false for 403 with no code property in data', () => {
    const error = {
      response: {
        status: 403,
        data: { message: 'forbidden' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(false);
  });

  test('returns false for non-403 status with verification code', () => {
    const error = {
      response: {
        status: 500,
        data: { code: 'VERIFICATION_REQUIRED' },
      },
    };
    expect(isVerificationRequiredError(error)).toBe(false);
  });
});

describe('extractVerificationInfo', () => {
  test('extracts code and message from error response data', () => {
    const error = {
      response: {
        data: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Please verify your identity',
        },
      },
    };
    const result = extractVerificationInfo(error);
    expect(result).toEqual({
      code: 'VERIFICATION_REQUIRED',
      message: 'Please verify your identity',
      required: true,
    });
  });

  test('uses default message when message is not provided', () => {
    const error = {
      response: {
        data: { code: 'VERIFICATION_EXPIRED' },
      },
    };
    const result = extractVerificationInfo(error);
    expect(result).toEqual({
      code: 'VERIFICATION_EXPIRED',
      message: '需要安全验证',
      required: true,
    });
  });

  test('handles missing response gracefully', () => {
    const error = {};
    const result = extractVerificationInfo(error);
    expect(result).toEqual({
      code: undefined,
      message: '需要安全验证',
      required: true,
    });
  });

  test('handles missing data in response', () => {
    const error = { response: {} };
    const result = extractVerificationInfo(error);
    expect(result).toEqual({
      code: undefined,
      message: '需要安全验证',
      required: true,
    });
  });

  test('always sets required to true', () => {
    const error = {
      response: {
        data: { code: 'VERIFICATION_INVALID', message: 'Invalid token' },
      },
    };
    expect(extractVerificationInfo(error).required).toBe(true);
  });
});

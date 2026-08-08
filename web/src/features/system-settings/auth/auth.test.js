import { authHeader } from './auth';

beforeEach(() => {
  localStorage.clear();
});

describe('authHeader', () => {
  test('returns Bearer token when user with token exists in localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ token: 'abc123' }));
    expect(authHeader()).toEqual({ Authorization: 'Bearer abc123' });
  });

  test('returns empty object when no user in localStorage', () => {
    expect(authHeader()).toEqual({});
  });

  test('returns empty object when user has no token', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'test' }));
    expect(authHeader()).toEqual({});
  });

  test('returns empty object when user token is empty string', () => {
    localStorage.setItem('user', JSON.stringify({ token: '' }));
    expect(authHeader()).toEqual({});
  });

  test('returns empty object when user is null in localStorage', () => {
    localStorage.setItem('user', 'null');
    expect(authHeader()).toEqual({});
  });

  test('uses the exact token from localStorage', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    localStorage.setItem('user', JSON.stringify({ token }));
    const header = authHeader();
    expect(header.Authorization).toBe('Bearer ' + token);
  });
});

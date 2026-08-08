import { userConstants } from './user.constants';

describe('userConstants', () => {
  test('is a plain object', () => {
    expect(typeof userConstants).toBe('object');
    expect(userConstants).not.toBeNull();
  });

  test('has register action types', () => {
    expect(userConstants.REGISTER_REQUEST).toBe('USERS_REGISTER_REQUEST');
    expect(userConstants.REGISTER_SUCCESS).toBe('USERS_REGISTER_SUCCESS');
    expect(userConstants.REGISTER_FAILURE).toBe('USERS_REGISTER_FAILURE');
  });

  test('has login action types', () => {
    expect(userConstants.LOGIN_REQUEST).toBe('USERS_LOGIN_REQUEST');
    expect(userConstants.LOGIN_SUCCESS).toBe('USERS_LOGIN_SUCCESS');
    expect(userConstants.LOGIN_FAILURE).toBe('USERS_LOGIN_FAILURE');
  });

  test('has logout action type', () => {
    expect(userConstants.LOGOUT).toBe('USERS_LOGOUT');
  });

  test('has getall action types', () => {
    expect(userConstants.GETALL_REQUEST).toBe('USERS_GETALL_REQUEST');
    expect(userConstants.GETALL_SUCCESS).toBe('USERS_GETALL_SUCCESS');
    expect(userConstants.GETALL_FAILURE).toBe('USERS_GETALL_FAILURE');
  });

  test('has delete action types', () => {
    expect(userConstants.DELETE_REQUEST).toBe('USERS_DELETE_REQUEST');
    expect(userConstants.DELETE_SUCCESS).toBe('USERS_DELETE_SUCCESS');
    expect(userConstants.DELETE_FAILURE).toBe('USERS_DELETE_FAILURE');
  });

  test('has exactly 13 properties', () => {
    expect(Object.keys(userConstants)).toHaveLength(13);
  });

  test('all values are unique', () => {
    const values = Object.values(userConstants);
    expect(new Set(values).size).toBe(values.length);
  });

  test('all values are non-empty strings', () => {
    Object.values(userConstants).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test('all values follow USERS_ prefix convention', () => {
    Object.values(userConstants).forEach((value) => {
      expect(value).toMatch(/^USERS_/);
    });
  });

  test('each operation group has REQUEST, SUCCESS, and FAILURE variants', () => {
    const groups = ['REGISTER', 'LOGIN', 'GETALL', 'DELETE'];
    groups.forEach((group) => {
      expect(userConstants[`${group}_REQUEST`]).toBe(
        `USERS_${group}_REQUEST`,
      );
      expect(userConstants[`${group}_SUCCESS`]).toBe(
        `USERS_${group}_SUCCESS`,
      );
      expect(userConstants[`${group}_FAILURE`]).toBe(
        `USERS_${group}_FAILURE`,
      );
    });
  });
});

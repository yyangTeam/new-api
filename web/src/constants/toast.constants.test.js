import { toastConstants } from './toast.constants';

describe('toastConstants', () => {
  test('is a plain object', () => {
    expect(typeof toastConstants).toBe('object');
    expect(toastConstants).not.toBeNull();
  });

  test('has exactly 5 timeout properties', () => {
    expect(Object.keys(toastConstants)).toHaveLength(5);
  });

  test('SUCCESS_TIMEOUT is 1500ms', () => {
    expect(toastConstants.SUCCESS_TIMEOUT).toBe(1500);
  });

  test('INFO_TIMEOUT is 3000ms', () => {
    expect(toastConstants.INFO_TIMEOUT).toBe(3000);
  });

  test('ERROR_TIMEOUT is 5000ms', () => {
    expect(toastConstants.ERROR_TIMEOUT).toBe(5000);
  });

  test('WARNING_TIMEOUT is 10000ms', () => {
    expect(toastConstants.WARNING_TIMEOUT).toBe(10000);
  });

  test('NOTICE_TIMEOUT is 20000ms', () => {
    expect(toastConstants.NOTICE_TIMEOUT).toBe(20000);
  });

  test('all values are positive numbers', () => {
    Object.values(toastConstants).forEach((value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  test('timeouts are in ascending order of severity', () => {
    expect(toastConstants.SUCCESS_TIMEOUT).toBeLessThan(
      toastConstants.INFO_TIMEOUT,
    );
    expect(toastConstants.INFO_TIMEOUT).toBeLessThan(
      toastConstants.ERROR_TIMEOUT,
    );
    expect(toastConstants.ERROR_TIMEOUT).toBeLessThan(
      toastConstants.WARNING_TIMEOUT,
    );
    expect(toastConstants.WARNING_TIMEOUT).toBeLessThan(
      toastConstants.NOTICE_TIMEOUT,
    );
  });
});

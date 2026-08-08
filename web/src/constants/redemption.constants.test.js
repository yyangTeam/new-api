import {
  REDEMPTION_STATUS,
  REDEMPTION_STATUS_MAP,
  REDEMPTION_ACTIONS,
} from './redemption.constants';

describe('REDEMPTION_STATUS', () => {
  test('has exactly three status values', () => {
    expect(Object.keys(REDEMPTION_STATUS)).toHaveLength(3);
  });

  test('defines UNUSED as 1', () => {
    expect(REDEMPTION_STATUS.UNUSED).toBe(1);
  });

  test('defines DISABLED as 2', () => {
    expect(REDEMPTION_STATUS.DISABLED).toBe(2);
  });

  test('defines USED as 3', () => {
    expect(REDEMPTION_STATUS.USED).toBe(3);
  });

  test('all values are unique', () => {
    const values = Object.values(REDEMPTION_STATUS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('REDEMPTION_STATUS_MAP', () => {
  test('has an entry for each status value', () => {
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.UNUSED]).toBeDefined();
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.DISABLED]).toBeDefined();
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.USED]).toBeDefined();
  });

  test('UNUSED entry has correct color and text', () => {
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.UNUSED]).toEqual({
      color: 'green',
      text: '未使用',
    });
  });

  test('DISABLED entry has correct color and text', () => {
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.DISABLED]).toEqual({
      color: 'red',
      text: '已禁用',
    });
  });

  test('USED entry has correct color and text', () => {
    expect(REDEMPTION_STATUS_MAP[REDEMPTION_STATUS.USED]).toEqual({
      color: 'grey',
      text: '已使用',
    });
  });

  test('every entry has both color and text properties', () => {
    Object.values(REDEMPTION_STATUS_MAP).forEach((entry) => {
      expect(entry).toHaveProperty('color');
      expect(entry).toHaveProperty('text');
      expect(typeof entry.color).toBe('string');
      expect(typeof entry.text).toBe('string');
    });
  });
});

describe('REDEMPTION_ACTIONS', () => {
  test('has exactly three actions', () => {
    expect(Object.keys(REDEMPTION_ACTIONS)).toHaveLength(3);
  });

  test('defines DELETE action', () => {
    expect(REDEMPTION_ACTIONS.DELETE).toBe('delete');
  });

  test('defines ENABLE action', () => {
    expect(REDEMPTION_ACTIONS.ENABLE).toBe('enable');
  });

  test('defines DISABLE action', () => {
    expect(REDEMPTION_ACTIONS.DISABLE).toBe('disable');
  });

  test('all action values are unique strings', () => {
    const values = Object.values(REDEMPTION_ACTIONS);
    expect(new Set(values).size).toBe(values.length);
    values.forEach((v) => expect(typeof v).toBe('string'));
  });
});

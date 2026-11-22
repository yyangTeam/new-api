import {
  CHART_CONFIG,
  CARD_PROPS,
  FORM_FIELD_PROPS,
  ICON_BUTTON_CLASS,
  FLEX_CENTER_GAP2,
  ILLUSTRATION_SIZE,
  TIME_OPTIONS,
  DEFAULT_TIME_INTERVALS,
  DEFAULT_TIME_RANGE,
  DEFAULT_CHART_SPECS,
  ANNOUNCEMENT_LEGEND_DATA,
  UPTIME_STATUS_MAP,
  STORAGE_KEYS,
  DEFAULTS,
} from './dashboard.constants';

describe('CHART_CONFIG', () => {
  test('has mode set to desktop-browser', () => {
    expect(CHART_CONFIG).toEqual({ mode: 'desktop-browser' });
  });
});

describe('CARD_PROPS', () => {
  test('has expected properties', () => {
    expect(CARD_PROPS).toEqual({
      shadows: '',
      bordered: true,
      headerLine: true,
    });
  });
});

describe('FORM_FIELD_PROPS', () => {
  test('has className and size', () => {
    expect(FORM_FIELD_PROPS.className).toBe('w-full mb-2 !rounded-lg');
    expect(FORM_FIELD_PROPS.size).toBe('large');
  });
});

describe('string constants', () => {
  test('ICON_BUTTON_CLASS is a non-empty string', () => {
    expect(typeof ICON_BUTTON_CLASS).toBe('string');
    expect(ICON_BUTTON_CLASS.length).toBeGreaterThan(0);
  });

  test('FLEX_CENTER_GAP2 is a non-empty string', () => {
    expect(typeof FLEX_CENTER_GAP2).toBe('string');
    expect(FLEX_CENTER_GAP2).toContain('flex');
  });
});

describe('ILLUSTRATION_SIZE', () => {
  test('has width and height', () => {
    expect(ILLUSTRATION_SIZE).toEqual({ width: 96, height: 96 });
  });
});

describe('TIME_OPTIONS', () => {
  test('has three entries with label and value', () => {
    expect(TIME_OPTIONS).toHaveLength(3);
    TIME_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty('label');
      expect(opt).toHaveProperty('value');
    });
  });

  test('values are hour, day, week', () => {
    const values = TIME_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['hour', 'day', 'week']);
  });
});

describe('DEFAULT_TIME_INTERVALS', () => {
  test('hour has correct seconds and minutes', () => {
    expect(DEFAULT_TIME_INTERVALS.hour).toEqual({ seconds: 3600, minutes: 60 });
  });

  test('day has correct seconds and minutes', () => {
    expect(DEFAULT_TIME_INTERVALS.day).toEqual({ seconds: 86400, minutes: 1440 });
  });

  test('week has correct seconds and minutes', () => {
    expect(DEFAULT_TIME_INTERVALS.week).toEqual({ seconds: 604800, minutes: 10080 });
  });

  test('intervals are mathematically consistent', () => {
    for (const key of Object.keys(DEFAULT_TIME_INTERVALS)) {
      const { seconds, minutes } = DEFAULT_TIME_INTERVALS[key];
      expect(seconds).toBe(minutes * 60);
    }
  });
});

describe('DEFAULT_TIME_RANGE', () => {
  test('has HOUR, DAY, WEEK keys', () => {
    expect(DEFAULT_TIME_RANGE).toEqual({
      HOUR: 'hour',
      DAY: 'day',
      WEEK: 'week',
    });
  });
});

describe('DEFAULT_CHART_SPECS', () => {
  test('PIE spec has correct type and fields', () => {
    const { PIE } = DEFAULT_CHART_SPECS;
    expect(PIE.type).toBe('pie');
    expect(PIE.outerRadius).toBe(0.8);
    expect(PIE.innerRadius).toBe(0.5);
    expect(PIE.valueField).toBe('value');
    expect(PIE.categoryField).toBe('type');
    expect(PIE.legends.visible).toBe(true);
    expect(PIE.label.visible).toBe(true);
  });

  test('BAR spec has correct type and stack enabled', () => {
    const { BAR } = DEFAULT_CHART_SPECS;
    expect(BAR.type).toBe('bar');
    expect(BAR.stack).toBe(true);
    expect(BAR.legends.visible).toBe(true);
    expect(BAR.legends.selectMode).toBe('single');
  });

  test('LINE spec has correct type', () => {
    const { LINE } = DEFAULT_CHART_SPECS;
    expect(LINE.type).toBe('line');
    expect(LINE.legends.visible).toBe(true);
    expect(LINE.legends.selectMode).toBe('single');
  });

  test('contains exactly PIE, BAR, LINE', () => {
    expect(Object.keys(DEFAULT_CHART_SPECS).sort()).toEqual(['BAR', 'LINE', 'PIE']);
  });
});

describe('ANNOUNCEMENT_LEGEND_DATA', () => {
  test('has five entries', () => {
    expect(ANNOUNCEMENT_LEGEND_DATA).toHaveLength(5);
  });

  test('each entry has color, label, type', () => {
    ANNOUNCEMENT_LEGEND_DATA.forEach((item) => {
      expect(item).toHaveProperty('color');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('type');
    });
  });

  test('types are default, ongoing, success, warning, error', () => {
    const types = ANNOUNCEMENT_LEGEND_DATA.map((i) => i.type);
    expect(types).toEqual(['default', 'ongoing', 'success', 'warning', 'error']);
  });
});

describe('UPTIME_STATUS_MAP', () => {
  test('has entries for status codes 0, 1, 2, 3', () => {
    expect(Object.keys(UPTIME_STATUS_MAP).sort()).toEqual(['0', '1', '2', '3']);
  });

  test('each entry has color, label, text', () => {
    Object.values(UPTIME_STATUS_MAP).forEach((entry) => {
      expect(entry).toHaveProperty('color');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('text');
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe('STORAGE_KEYS', () => {
  test('has expected key names', () => {
    expect(STORAGE_KEYS.DATA_EXPORT_DEFAULT_TIME).toBe('data_export_default_time');
    expect(STORAGE_KEYS.MJ_NOTIFY_ENABLED).toBe('mj_notify_enabled');
  });
});

describe('DEFAULTS', () => {
  test('has expected numeric defaults', () => {
    expect(DEFAULTS.PAGE_SIZE).toBe(20);
    expect(DEFAULTS.CHART_HEIGHT).toBe(96);
    expect(DEFAULTS.MODEL_TABLE_PAGE_SIZE).toBe(10);
    expect(DEFAULTS.MAX_TREND_POINTS).toBe(7);
  });

  test('all values are positive numbers', () => {
    Object.values(DEFAULTS).forEach((val) => {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThan(0);
    });
  });
});

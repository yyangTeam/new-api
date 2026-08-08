import {
  ITEMS_PER_PAGE,
  DEFAULT_ENDPOINT,
  TABLE_COMPACT_MODES_KEY,
  API_ENDPOINTS,
  TASK_ACTION_GENERATE,
  TASK_ACTION_TEXT_GENERATE,
  TASK_ACTION_FIRST_TAIL_GENERATE,
  TASK_ACTION_REFERENCE_GENERATE,
  TASK_ACTION_REMIX_GENERATE,
} from './common.constant';

describe('ITEMS_PER_PAGE', () => {
  test('is 10', () => {
    expect(ITEMS_PER_PAGE).toBe(10);
  });
});

describe('DEFAULT_ENDPOINT', () => {
  test('is /api/pricing', () => {
    expect(DEFAULT_ENDPOINT).toBe('/api/pricing');
  });
});

describe('TABLE_COMPACT_MODES_KEY', () => {
  test('is a non-empty string', () => {
    expect(typeof TABLE_COMPACT_MODES_KEY).toBe('string');
    expect(TABLE_COMPACT_MODES_KEY.length).toBeGreaterThan(0);
    expect(TABLE_COMPACT_MODES_KEY).toBe('table_compact_modes');
  });
});

describe('API_ENDPOINTS', () => {
  test('is a non-empty array of strings', () => {
    expect(Array.isArray(API_ENDPOINTS)).toBe(true);
    expect(API_ENDPOINTS.length).toBeGreaterThan(0);
    for (const endpoint of API_ENDPOINTS) {
      expect(typeof endpoint).toBe('string');
    }
  });

  test('all endpoints start with /v1', () => {
    for (const endpoint of API_ENDPOINTS) {
      expect(endpoint.startsWith('/v1')).toBe(true);
    }
  });

  test('contains key API endpoints', () => {
    expect(API_ENDPOINTS).toContain('/v1/chat/completions');
    expect(API_ENDPOINTS).toContain('/v1/responses');
    expect(API_ENDPOINTS).toContain('/v1/messages');
    expect(API_ENDPOINTS).toContain('/v1/embeddings');
    expect(API_ENDPOINTS).toContain('/v1/images/generations');
    expect(API_ENDPOINTS).toContain('/v1/audio/speech');
    expect(API_ENDPOINTS).toContain('/v1/audio/transcriptions');
  });

  test('has no duplicate entries', () => {
    const unique = new Set(API_ENDPOINTS);
    expect(unique.size).toBe(API_ENDPOINTS.length);
  });
});

describe('TASK_ACTION constants', () => {
  test('TASK_ACTION_GENERATE is "generate"', () => {
    expect(TASK_ACTION_GENERATE).toBe('generate');
  });

  test('TASK_ACTION_TEXT_GENERATE is "textGenerate"', () => {
    expect(TASK_ACTION_TEXT_GENERATE).toBe('textGenerate');
  });

  test('TASK_ACTION_FIRST_TAIL_GENERATE is "firstTailGenerate"', () => {
    expect(TASK_ACTION_FIRST_TAIL_GENERATE).toBe('firstTailGenerate');
  });

  test('TASK_ACTION_REFERENCE_GENERATE is "referenceGenerate"', () => {
    expect(TASK_ACTION_REFERENCE_GENERATE).toBe('referenceGenerate');
  });

  test('TASK_ACTION_REMIX_GENERATE is "remixGenerate"', () => {
    expect(TASK_ACTION_REMIX_GENERATE).toBe('remixGenerate');
  });

  test('all task action values are unique', () => {
    const values = [
      TASK_ACTION_GENERATE,
      TASK_ACTION_TEXT_GENERATE,
      TASK_ACTION_FIRST_TAIL_GENERATE,
      TASK_ACTION_REFERENCE_GENERATE,
      TASK_ACTION_REMIX_GENERATE,
    ];
    expect(new Set(values).size).toBe(values.length);
  });
});

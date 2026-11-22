vi.mock('@douyinfe/semi-ui', () => ({
  Toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
  Pagination: () => null,
}));
vi.mock('react-toastify', () => ({ toast: vi.fn() }));

import {
  isAdmin,
  isRoot,
  getSystemName,
  getLogo,
  getUserIdFromLocalStorage,
  getFooterHTML,
  removeTrailingSlash,
  timestamp2string,
  timestamp2string1,
  isDataCrossYear,
  verifyJSON,
  verifyJSONPromise,
  shouldShowPrompt,
  setPromptShown,
  compareObjects,
  getTextContent,
  processThinkTags,
  processIncompleteThinkTags,
  buildMessageContent,
  createMessage,
  hasImageContent,
  formatMessageForAPI,
  isValidMessage,
  getLastUserMessage,
  getLastAssistantMessage,
  formatDateString,
  formatDateTimeString,
  getTableCompactMode,
  setTableCompactMode,
  selectFilter,
} from './utils';

beforeEach(() => {
  localStorage.clear();
});

describe('isAdmin', () => {
  test('returns false when no user in localStorage', () => {
    expect(isAdmin()).toBe(false);
  });

  test('returns false for role < 10', () => {
    localStorage.setItem('user', JSON.stringify({ role: 1 }));
    expect(isAdmin()).toBe(false);
  });

  test('returns true for role === 10', () => {
    localStorage.setItem('user', JSON.stringify({ role: 10 }));
    expect(isAdmin()).toBe(true);
  });

  test('returns true for role > 10', () => {
    localStorage.setItem('user', JSON.stringify({ role: 100 }));
    expect(isAdmin()).toBe(true);
  });
});

describe('isRoot', () => {
  test('returns false when no user in localStorage', () => {
    expect(isRoot()).toBe(false);
  });

  test('returns false for role < 100', () => {
    localStorage.setItem('user', JSON.stringify({ role: 10 }));
    expect(isRoot()).toBe(false);
  });

  test('returns true for role === 100', () => {
    localStorage.setItem('user', JSON.stringify({ role: 100 }));
    expect(isRoot()).toBe(true);
  });

  test('returns true for role > 100', () => {
    localStorage.setItem('user', JSON.stringify({ role: 200 }));
    expect(isRoot()).toBe(true);
  });
});

describe('getSystemName', () => {
  test('returns "New API" when not set', () => {
    expect(getSystemName()).toBe('New API');
  });

  test('returns stored name', () => {
    localStorage.setItem('system_name', 'My API');
    expect(getSystemName()).toBe('My API');
  });
});

describe('getLogo', () => {
  test('returns "/logo.png" when not set', () => {
    expect(getLogo()).toBe('/logo.png');
  });

  test('returns stored logo', () => {
    localStorage.setItem('logo', '/custom-logo.png');
    expect(getLogo()).toBe('/custom-logo.png');
  });
});

describe('getUserIdFromLocalStorage', () => {
  test('returns -1 when no user', () => {
    expect(getUserIdFromLocalStorage()).toBe(-1);
  });

  test('returns user id', () => {
    localStorage.setItem('user', JSON.stringify({ id: 42 }));
    expect(getUserIdFromLocalStorage()).toBe(42);
  });
});

describe('getFooterHTML', () => {
  test('returns null when not set', () => {
    expect(getFooterHTML()).toBeNull();
  });

  test('returns stored footer HTML', () => {
    localStorage.setItem('footer_html', '<p>footer</p>');
    expect(getFooterHTML()).toBe('<p>footer</p>');
  });
});

describe('removeTrailingSlash', () => {
  test('returns empty string for empty input', () => {
    expect(removeTrailingSlash('')).toBe('');
  });

  test('returns empty string for null', () => {
    expect(removeTrailingSlash(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(removeTrailingSlash(undefined)).toBe('');
  });

  test('removes trailing slash', () => {
    expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com');
  });

  test('does not modify URL without trailing slash', () => {
    expect(removeTrailingSlash('https://example.com')).toBe('https://example.com');
  });

  test('removes only the last slash', () => {
    expect(removeTrailingSlash('https://example.com/path/')).toBe(
      'https://example.com/path',
    );
  });
});

describe('timestamp2string', () => {
  test('formats a timestamp correctly', () => {
    const ts = new Date(2024, 0, 5, 9, 3, 7).getTime() / 1000;
    expect(timestamp2string(ts)).toBe('2024-01-05 09:03:07');
  });

  test('pads single-digit month, day, hour, minute, second', () => {
    const ts = new Date(2023, 2, 1, 1, 2, 3).getTime() / 1000;
    expect(timestamp2string(ts)).toBe('2023-03-01 01:02:03');
  });

  test('handles double-digit values', () => {
    const ts = new Date(2023, 11, 25, 13, 45, 59).getTime() / 1000;
    expect(timestamp2string(ts)).toBe('2023-12-25 13:45:59');
  });
});

describe('timestamp2string1', () => {
  test('formats with hour granularity by default (no year)', () => {
    const ts = new Date(2024, 2, 15, 14, 30, 0).getTime() / 1000;
    const result = timestamp2string1(ts);
    expect(result).toBe('03-15 14:00');
  });

  test('formats with hour and showYear', () => {
    const ts = new Date(2024, 2, 15, 14, 30, 0).getTime() / 1000;
    const result = timestamp2string1(ts, 'hour', true);
    expect(result).toBe('2024-03-15 14:00');
  });

  test('formats day granularity (no hour appended)', () => {
    const ts = new Date(2024, 0, 1, 0, 0, 0).getTime() / 1000;
    const result = timestamp2string1(ts, 'day');
    expect(result).toBe('01-01');
  });

  test('formats week range', () => {
    const ts = new Date(2024, 0, 1, 0, 0, 0).getTime() / 1000;
    const result = timestamp2string1(ts, 'week');
    expect(result).toMatch(/^01-01 - 01-07$/);
  });

  test('formats week range with showYear', () => {
    const ts = new Date(2024, 11, 28, 0, 0, 0).getTime() / 1000;
    const result = timestamp2string1(ts, 'week', true);
    expect(result).toBe('2024-12-28 - 2025-01-03');
  });
});

describe('isDataCrossYear', () => {
  test('returns false for empty array', () => {
    expect(isDataCrossYear([])).toBe(false);
  });

  test('returns false for null', () => {
    expect(isDataCrossYear(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isDataCrossYear(undefined)).toBe(false);
  });

  test('returns false when all timestamps in same year', () => {
    const ts1 = new Date(2024, 0, 1).getTime() / 1000;
    const ts2 = new Date(2024, 6, 1).getTime() / 1000;
    expect(isDataCrossYear([ts1, ts2])).toBe(false);
  });

  test('returns true when timestamps span multiple years', () => {
    const ts1 = new Date(2023, 11, 31).getTime() / 1000;
    const ts2 = new Date(2024, 0, 1).getTime() / 1000;
    expect(isDataCrossYear([ts1, ts2])).toBe(true);
  });
});

describe('verifyJSON', () => {
  test('returns true for valid JSON object', () => {
    expect(verifyJSON('{"a":1}')).toBe(true);
  });

  test('returns true for valid JSON array', () => {
    expect(verifyJSON('[1,2,3]')).toBe(true);
  });

  test('returns true for valid JSON string', () => {
    expect(verifyJSON('"hello"')).toBe(true);
  });

  test('returns true for valid JSON number', () => {
    expect(verifyJSON('42')).toBe(true);
  });

  test('returns true for valid JSON boolean', () => {
    expect(verifyJSON('true')).toBe(true);
  });

  test('returns true for valid JSON null', () => {
    expect(verifyJSON('null')).toBe(true);
  });

  test('returns false for invalid JSON', () => {
    expect(verifyJSON('{invalid}')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(verifyJSON('')).toBe(false);
  });

  test('returns false for plain text', () => {
    expect(verifyJSON('hello world')).toBe(false);
  });
});

describe('verifyJSONPromise', () => {
  test('resolves for valid JSON', async () => {
    await expect(verifyJSONPromise('{"a":1}')).resolves.toBeUndefined();
  });

  test('rejects for invalid JSON', async () => {
    await expect(verifyJSONPromise('{bad}')).rejects.toBe(
      '不是合法的 JSON 字符串',
    );
  });
});

describe('shouldShowPrompt / setPromptShown', () => {
  test('returns true when prompt not shown yet', () => {
    expect(shouldShowPrompt('test-1')).toBe(true);
  });

  test('returns false after prompt is shown', () => {
    setPromptShown('test-1');
    expect(shouldShowPrompt('test-1')).toBe(false);
  });

  test('different ids are independent', () => {
    setPromptShown('a');
    expect(shouldShowPrompt('a')).toBe(false);
    expect(shouldShowPrompt('b')).toBe(true);
  });
});

describe('compareObjects', () => {
  test('returns empty array when objects are the same', () => {
    const obj = { a: 1, b: 'x' };
    expect(compareObjects(obj, { ...obj })).toEqual([]);
  });

  test('detects changed properties', () => {
    const old = { a: 1, b: 2 };
    const updated = { a: 1, b: 3 };
    expect(compareObjects(old, updated)).toEqual([
      { key: 'b', oldValue: 2, newValue: 3 },
    ]);
  });

  test('ignores properties only in new object', () => {
    const old = { a: 1 };
    const updated = { a: 1, b: 2 };
    expect(compareObjects(old, updated)).toEqual([]);
  });

  test('ignores properties only in old object', () => {
    const old = { a: 1, b: 2 };
    const updated = { a: 1 };
    expect(compareObjects(old, updated)).toEqual([]);
  });

  test('detects multiple changes', () => {
    const old = { a: 1, b: 2, c: 3 };
    const updated = { a: 10, b: 2, c: 30 };
    const result = compareObjects(old, updated);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ key: 'a', oldValue: 1, newValue: 10 });
    expect(result).toContainEqual({ key: 'c', oldValue: 3, newValue: 30 });
  });
});

describe('getTextContent', () => {
  test('returns empty string for null message', () => {
    expect(getTextContent(null)).toBe('');
  });

  test('returns empty string for message without content', () => {
    expect(getTextContent({ role: 'user' })).toBe('');
  });

  test('returns string content directly', () => {
    expect(getTextContent({ content: 'hello' })).toBe('hello');
  });

  test('extracts text from array content', () => {
    const msg = {
      content: [
        { type: 'image_url', image_url: { url: 'http://img.png' } },
        { type: 'text', text: 'caption' },
      ],
    };
    expect(getTextContent(msg)).toBe('caption');
  });

  test('returns empty string when array has no text item', () => {
    const msg = {
      content: [{ type: 'image_url', image_url: { url: 'http://img.png' } }],
    };
    expect(getTextContent(msg)).toBe('');
  });

  test('returns empty string for non-string non-array content', () => {
    expect(getTextContent({ content: 123 })).toBe('');
  });
});

describe('processThinkTags', () => {
  test('returns unchanged content when no think tags', () => {
    const result = processThinkTags('Hello world');
    expect(result.content).toBe('Hello world');
    expect(result.reasoningContent).toBe('');
  });

  test('returns unchanged content for null', () => {
    const result = processThinkTags(null);
    expect(result.content).toBeNull();
    expect(result.reasoningContent).toBe('');
  });

  test('extracts single think tag', () => {
    const result = processThinkTags('<think>reasoning here</think>Answer here');
    expect(result.content).toBe('Answer here');
    expect(result.reasoningContent).toBe('reasoning here');
  });

  test('extracts multiple think tags', () => {
    const result = processThinkTags(
      '<think>thought 1</think>text<think>thought 2</think>more text',
    );
    expect(result.content).toBe('textmore text');
    expect(result.reasoningContent).toBe('thought 1\n\n---\n\nthought 2');
  });

  test('combines with existing reasoning content', () => {
    const result = processThinkTags(
      '<think>new thought</think>Answer',
      'existing reasoning',
    );
    expect(result.content).toBe('Answer');
    expect(result.reasoningContent).toBe(
      'existing reasoning\n\n---\n\nnew thought',
    );
  });

  test('returns existing reasoning when no new thoughts', () => {
    const result = processThinkTags('No tags here', 'existing');
    expect(result.content).toBe('No tags here');
    expect(result.reasoningContent).toBe('existing');
  });
});

describe('processIncompleteThinkTags', () => {
  test('returns empty content for null/empty', () => {
    expect(processIncompleteThinkTags(null).content).toBe('');
    expect(processIncompleteThinkTags('').content).toBe('');
  });

  test('processes complete think tags normally', () => {
    const result = processIncompleteThinkTags(
      '<think>thought</think>Answer',
    );
    expect(result.content).toBe('Answer');
    expect(result.reasoningContent).toBe('thought');
  });

  test('handles unclosed think tag', () => {
    const result = processIncompleteThinkTags(
      'Before<think>still thinking...',
    );
    expect(result.content).toBe('Before');
    expect(result.reasoningContent).toBe('still thinking...');
  });

  test('handles unclosed think tag with existing reasoning', () => {
    const result = processIncompleteThinkTags(
      '<think>streaming...',
      'prior reasoning',
    );
    expect(result.content).toBe('');
    expect(result.reasoningContent).toBe(
      'prior reasoning\n\n---\n\nstreaming...',
    );
  });

  test('handles empty unclosed think tag', () => {
    const result = processIncompleteThinkTags('text<think>');
    expect(result.content).toBe('text');
    expect(result.reasoningContent).toBe('');
  });

  test('passes through content without think tags', () => {
    const result = processIncompleteThinkTags('plain text');
    expect(result.content).toBe('plain text');
    expect(result.reasoningContent).toBe('');
  });
});

describe('buildMessageContent', () => {
  test('returns empty string when both text and images are empty', () => {
    expect(buildMessageContent('', [], false)).toBe('');
  });

  test('returns text-only when imageEnabled is false', () => {
    expect(buildMessageContent('hello', ['http://img.png'], false)).toBe('hello');
  });

  test('returns text-only when no valid image urls', () => {
    expect(buildMessageContent('hello', ['', '  '], true)).toBe('hello');
  });

  test('returns array content with images when enabled', () => {
    const result = buildMessageContent('hello', ['http://img.png'], true);
    expect(result).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'image_url', image_url: { url: 'http://img.png' } },
    ]);
  });

  test('trims image URLs', () => {
    const result = buildMessageContent('text', ['  http://img.png  '], true);
    expect(result[1].image_url.url).toBe('http://img.png');
  });

  test('filters out empty image URLs', () => {
    const result = buildMessageContent(
      'text',
      ['http://a.png', '', 'http://b.png'],
      true,
    );
    expect(result).toHaveLength(3);
  });

  test('returns empty text in array when textContent is empty but images exist', () => {
    const result = buildMessageContent('', ['http://img.png'], true);
    expect(result[0]).toEqual({ type: 'text', text: '' });
  });

  test('returns empty string when textContent is null and no images', () => {
    expect(buildMessageContent(null, [], false)).toBe('');
  });
});

describe('createMessage', () => {
  test('creates a message with role and content', () => {
    const msg = createMessage('user', 'hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    expect(msg.createAt).toBeDefined();
    expect(msg.id).toBeDefined();
  });

  test('merges additional options', () => {
    const msg = createMessage('assistant', 'hi', {
      reasoningContent: 'thought',
    });
    expect(msg.reasoningContent).toBe('thought');
    expect(msg.role).toBe('assistant');
  });

  test('generates incrementing ids', () => {
    const msg1 = createMessage('user', 'a');
    const msg2 = createMessage('user', 'b');
    expect(Number(msg2.id)).toBeGreaterThan(Number(msg1.id));
  });
});

describe('hasImageContent', () => {
  test('returns falsy for null', () => {
    expect(hasImageContent(null)).toBeFalsy();
  });

  test('returns falsy for string content', () => {
    expect(hasImageContent({ content: 'hello' })).toBeFalsy();
  });

  test('returns falsy for array without image_url', () => {
    expect(
      hasImageContent({ content: [{ type: 'text', text: 'hi' }] }),
    ).toBeFalsy();
  });

  test('returns truthy for array with image_url', () => {
    expect(
      hasImageContent({
        content: [
          { type: 'text', text: 'hi' },
          { type: 'image_url', image_url: { url: 'http://img.png' } },
        ],
      }),
    ).toBeTruthy();
  });
});

describe('formatMessageForAPI', () => {
  test('returns null for null input', () => {
    expect(formatMessageForAPI(null)).toBeNull();
  });

  test('returns role and content only', () => {
    const msg = {
      role: 'user',
      content: 'hello',
      id: '1',
      createAt: 123,
      extra: true,
    };
    expect(formatMessageForAPI(msg)).toEqual({
      role: 'user',
      content: 'hello',
    });
  });
});

describe('isValidMessage', () => {
  test('returns falsy for null', () => {
    expect(isValidMessage(null)).toBeFalsy();
  });

  test('returns falsy for message without role', () => {
    expect(isValidMessage({ content: 'hi' })).toBeFalsy();
  });

  test('returns truthy for valid message with content', () => {
    expect(isValidMessage({ role: 'user', content: 'hi' })).toBeTruthy();
  });

  test('returns truthy for valid message with empty string content', () => {
    expect(isValidMessage({ role: 'assistant', content: '' })).toBeTruthy();
  });

  test('returns falsy for message with null content and no role', () => {
    expect(isValidMessage({ content: null })).toBeFalsy();
  });
});

describe('getLastUserMessage', () => {
  test('returns null for non-array', () => {
    expect(getLastUserMessage(null)).toBeNull();
    expect(getLastUserMessage('string')).toBeNull();
  });

  test('returns null when no user message exists', () => {
    expect(
      getLastUserMessage([{ role: 'assistant', content: 'hi' }]),
    ).toBeNull();
  });

  test('returns the last user message', () => {
    const messages = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ];
    expect(getLastUserMessage(messages).content).toBe('second');
  });
});

describe('getLastAssistantMessage', () => {
  test('returns null for non-array', () => {
    expect(getLastAssistantMessage(null)).toBeNull();
  });

  test('returns null when no assistant message exists', () => {
    expect(
      getLastAssistantMessage([{ role: 'user', content: 'hi' }]),
    ).toBeNull();
  });

  test('returns the last assistant message', () => {
    const messages = [
      { role: 'assistant', content: 'first' },
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'second' },
    ];
    expect(getLastAssistantMessage(messages).content).toBe('second');
  });
});

describe('formatDateString', () => {
  test('formats a date correctly', () => {
    const date = new Date(2024, 0, 5);
    expect(formatDateString(date)).toBe('2024-01-05');
  });

  test('pads single-digit month and day', () => {
    const date = new Date(2023, 2, 1);
    expect(formatDateString(date)).toBe('2023-03-01');
  });
});

describe('formatDateTimeString', () => {
  test('formats date and time correctly', () => {
    const date = new Date(2024, 0, 5, 9, 3);
    expect(formatDateTimeString(date)).toBe('2024-01-05 09:03');
  });

  test('pads single-digit hours and minutes', () => {
    const date = new Date(2023, 11, 25, 1, 2);
    expect(formatDateTimeString(date)).toBe('2023-12-25 01:02');
  });
});

describe('getTableCompactMode / setTableCompactMode', () => {
  test('returns false by default', () => {
    expect(getTableCompactMode()).toBe(false);
  });

  test('returns false for unknown table key', () => {
    expect(getTableCompactMode('unknown')).toBe(false);
  });

  test('sets and gets global compact mode', () => {
    setTableCompactMode(true);
    expect(getTableCompactMode()).toBe(true);
  });

  test('sets and gets for specific table key', () => {
    setTableCompactMode(true, 'users');
    expect(getTableCompactMode('users')).toBe(true);
    expect(getTableCompactMode('channels')).toBe(false);
  });

  test('can disable compact mode', () => {
    setTableCompactMode(true, 'test');
    setTableCompactMode(false, 'test');
    expect(getTableCompactMode('test')).toBe(false);
  });

  test('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('table_compact_modes', 'not-json');
    expect(getTableCompactMode()).toBe(false);
  });
});

describe('selectFilter', () => {
  test('returns true when input is empty', () => {
    expect(selectFilter('', { value: 'a', label: 'b' })).toBe(true);
  });

  test('returns true when input is null', () => {
    expect(selectFilter(null, { value: 'a', label: 'b' })).toBe(true);
  });

  test('matches by value', () => {
    expect(selectFilter('gpt', { value: 'gpt-4', label: 'GPT Model' })).toBe(
      true,
    );
  });

  test('matches by label', () => {
    expect(selectFilter('Model', { value: 'gpt-4', label: 'GPT Model' })).toBe(
      true,
    );
  });

  test('is case insensitive', () => {
    expect(selectFilter('GPT', { value: 'gpt-4', label: 'test' })).toBe(true);
  });

  test('returns false when no match', () => {
    expect(selectFilter('claude', { value: 'gpt-4', label: 'GPT' })).toBe(
      false,
    );
  });

  test('handles missing value/label', () => {
    expect(selectFilter('test', {})).toBe(false);
    expect(selectFilter('test', null)).toBe(false);
  });

  test('trims input whitespace', () => {
    expect(selectFilter('  gpt  ', { value: 'gpt-4', label: '' })).toBe(true);
  });

  test('handles numeric value', () => {
    expect(selectFilter('42', { value: 42, label: '' })).toBe(true);
  });
});

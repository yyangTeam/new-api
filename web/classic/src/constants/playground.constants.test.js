import {
  getDefaultMessages,
  MESSAGE_ROLES,
  DEFAULT_MESSAGES,
  THINK_TAG_REGEX,
} from './playground.constants';

describe('getDefaultMessages', () => {
  test('returns an array of two messages', () => {
    const t = (key) => key;
    const messages = getDefaultMessages(t);
    expect(messages).toHaveLength(2);
  });

  test('first message has user role', () => {
    const t = (key) => key;
    const messages = getDefaultMessages(t);
    expect(messages[0].role).toBe(MESSAGE_ROLES.USER);
  });

  test('second message has assistant role', () => {
    const t = (key) => key;
    const messages = getDefaultMessages(t);
    expect(messages[1].role).toBe(MESSAGE_ROLES.ASSISTANT);
  });

  test('passes content through translation function', () => {
    const t = (key) => `[translated] ${key}`;
    const messages = getDefaultMessages(t);
    expect(messages[0].content).toBe('[translated] 默认用户消息');
    expect(messages[1].content).toBe('[translated] 默认助手消息');
  });

  test('messages have required fields', () => {
    const t = (key) => key;
    const messages = getDefaultMessages(t);
    for (const msg of messages) {
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('createAt');
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
    }
  });
});

describe('DEFAULT_MESSAGES', () => {
  test('has two messages with user and assistant roles', () => {
    expect(DEFAULT_MESSAGES).toHaveLength(2);
    expect(DEFAULT_MESSAGES[0].role).toBe(MESSAGE_ROLES.USER);
    expect(DEFAULT_MESSAGES[1].role).toBe(MESSAGE_ROLES.ASSISTANT);
  });

  test('has hardcoded English content', () => {
    expect(DEFAULT_MESSAGES[0].content).toBe('Hello');
    expect(DEFAULT_MESSAGES[1].content).toBe('Hello! How can I help you today?');
  });
});

describe('THINK_TAG_REGEX', () => {
  test('matches think tags in text', () => {
    const text = 'before <think>reasoning here</think> after';
    const matches = [...text.matchAll(THINK_TAG_REGEX)];
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('reasoning here');
  });

  test('matches multiple think tags', () => {
    const text = '<think>first</think> middle <think>second</think>';
    const matches = [...text.matchAll(THINK_TAG_REGEX)];
    expect(matches).toHaveLength(2);
    expect(matches[0][1]).toBe('first');
    expect(matches[1][1]).toBe('second');
  });

  test('matches multiline content inside think tags', () => {
    const text = '<think>line1\nline2\nline3</think>';
    const matches = [...text.matchAll(THINK_TAG_REGEX)];
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('line1\nline2\nline3');
  });

  test('does not match unclosed think tags', () => {
    const text = '<think>unclosed content';
    const matches = [...text.matchAll(THINK_TAG_REGEX)];
    expect(matches).toHaveLength(0);
  });
});

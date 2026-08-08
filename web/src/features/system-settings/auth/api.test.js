import { buildApiPayload, processModelsData, processGroupsData, handleApiError } from './api';

vi.mock('./utils', () => ({
  getUserIdFromLocalStorage: () => '1',
  showError: vi.fn(),
  formatMessageForAPI: (msg) => ({
    role: msg.role,
    content: msg.content,
  }),
  isValidMessage: (msg) => msg && msg.content && msg.content.trim().length > 0,
  showSuccess: vi.fn(),
}));

vi.mock('../constants/playground.constants', () => ({
  MESSAGE_ROLES: {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
  },
}));

describe('buildApiPayload', () => {
  test('builds basic payload with messages', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const inputs = { model: 'gpt-4', group: 'default', stream: true };
    const parameterEnabled = {};

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.model).toBe('gpt-4');
    expect(result.group).toBe('default');
    expect(result.stream).toBe(true);
    expect(result.messages).toHaveLength(2);
  });

  test('prepends system prompt when provided', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const inputs = { model: 'gpt-4', group: '', stream: false };
    const parameterEnabled = {};

    const result = buildApiPayload(messages, 'You are a helpful assistant', inputs, parameterEnabled);
    expect(result.messages[0].role).toBe('system');
    expect(result.messages[0].content).toBe('You are a helpful assistant');
    expect(result.messages).toHaveLength(2);
  });

  test('does not prepend system prompt when empty or whitespace', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const inputs = { model: 'gpt-4', group: '', stream: false };
    const parameterEnabled = {};

    const result1 = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result1.messages).toHaveLength(1);

    const result2 = buildApiPayload(messages, '   ', inputs, parameterEnabled);
    expect(result2.messages).toHaveLength(1);
  });

  test('filters out empty messages', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'user', content: '' },
      { role: 'user', content: '   ' },
    ];
    const inputs = { model: 'gpt-4', group: '', stream: false };
    const parameterEnabled = {};

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.messages).toHaveLength(1);
  });

  test('includes enabled parameters', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const inputs = {
      model: 'gpt-4',
      group: '',
      stream: false,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
    };
    const parameterEnabled = {
      temperature: true,
      top_p: true,
      max_tokens: true,
      frequency_penalty: true,
      presence_penalty: true,
    };

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.temperature).toBe(0.7);
    expect(result.top_p).toBe(0.9);
    expect(result.max_tokens).toBe(1024);
    expect(result.frequency_penalty).toBe(0.5);
    expect(result.presence_penalty).toBe(0.3);
  });

  test('does not include disabled parameters', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const inputs = {
      model: 'gpt-4',
      group: '',
      stream: false,
      temperature: 0.7,
      top_p: 0.9,
    };
    const parameterEnabled = {
      temperature: false,
      top_p: false,
    };

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.temperature).toBeUndefined();
    expect(result.top_p).toBeUndefined();
  });

  test('max_tokens only included when it is a number', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const inputs = {
      model: 'gpt-4',
      group: '',
      stream: false,
      max_tokens: 'not a number',
    };
    const parameterEnabled = { max_tokens: true };

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.max_tokens).toBeUndefined();
  });

  test('includes seed parameter when enabled', () => {
    const messages = [{ role: 'user', content: 'Hi' }];
    const inputs = { model: 'gpt-4', group: '', stream: false, seed: 42 };
    const parameterEnabled = { seed: true };

    const result = buildApiPayload(messages, '', inputs, parameterEnabled);
    expect(result.seed).toBe(42);
  });
});

describe('processModelsData', () => {
  test('creates model options from data array', () => {
    const data = ['gpt-4', 'gpt-3.5-turbo', 'claude-3'];
    const { modelOptions, selectedModel } = processModelsData(data, 'gpt-4');
    expect(modelOptions).toEqual([
      { label: 'gpt-4', value: 'gpt-4' },
      { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
      { label: 'claude-3', value: 'claude-3' },
    ]);
    expect(selectedModel).toBe('gpt-4');
  });

  test('selects first model when current model is not in list', () => {
    const data = ['gpt-4', 'claude-3'];
    const { selectedModel } = processModelsData(data, 'nonexistent');
    expect(selectedModel).toBe('gpt-4');
  });

  test('handles empty data', () => {
    const { modelOptions, selectedModel } = processModelsData([], 'gpt-4');
    expect(modelOptions).toEqual([]);
    expect(selectedModel).toBeUndefined();
  });
});

describe('processGroupsData', () => {
  test('creates group options from data entries', () => {
    const data = {
      default: { desc: 'Default group', ratio: 1 },
      vip: { desc: 'VIP group', ratio: 0.5 },
    };
    const result = processGroupsData(data, '');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('default');
    expect(result[1].value).toBe('vip');
  });

  test('truncates long descriptions to 20 chars', () => {
    const data = {
      group1: { desc: 'A very long description that exceeds twenty characters', ratio: 1 },
    };
    const result = processGroupsData(data, '');
    expect(result[0].label).toBe('A very long descript...');
    expect(result[0].fullLabel).toBe('A very long description that exceeds twenty characters');
  });

  test('keeps short descriptions as-is', () => {
    const data = {
      group1: { desc: 'Short desc', ratio: 1 },
    };
    const result = processGroupsData(data, '');
    expect(result[0].label).toBe('Short desc');
  });

  test('returns default option when data is empty', () => {
    const result = processGroupsData({}, '');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('');
    expect(result[0].ratio).toBe(1);
  });

  test('moves user group to the front', () => {
    const data = {
      default: { desc: 'Default', ratio: 1 },
      vip: { desc: 'VIP', ratio: 0.5 },
      premium: { desc: 'Premium', ratio: 0.3 },
    };
    const result = processGroupsData(data, 'premium');
    expect(result[0].value).toBe('premium');
    expect(result).toHaveLength(3);
  });

  test('does not reorder when user group is not found', () => {
    const data = {
      default: { desc: 'Default', ratio: 1 },
      vip: { desc: 'VIP', ratio: 0.5 },
    };
    const result = processGroupsData(data, 'nonexistent');
    expect(result[0].value).toBe('default');
  });
});

describe('handleApiError', () => {
  test('creates error info from basic error', () => {
    const error = new Error('Something failed');
    const result = handleApiError(error);
    expect(result.error).toBe('Something failed');
    expect(result.timestamp).toBeTruthy();
    expect(result.stack).toBeTruthy();
  });

  test('includes response info when provided', () => {
    const error = new Error('HTTP error 500');
    const response = { status: 500, statusText: 'Internal Server Error' };
    const result = handleApiError(error, response);
    expect(result.status).toBe(500);
    expect(result.statusText).toBe('Internal Server Error');
    expect(result.details).toBe('服务器返回了错误状态码');
  });

  test('detects fetch failure errors', () => {
    const error = new Error('Failed to fetch');
    const result = handleApiError(error);
    expect(result.details).toBe('网络连接失败或服务器无响应');
  });

  test('handles error with empty message', () => {
    const error = new Error('');
    const result = handleApiError(error);
    expect(result.error).toBe('未知错误');
  });
});

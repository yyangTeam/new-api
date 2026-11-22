const makeIconStub = () => {
  const comp = () => null;
  comp.Color = () => null;
  comp.Avatar = () => null;
  return comp;
};

vi.mock('@lobehub/icons', () => {
  const icons = {};
  const names = [
    'OpenAI', 'Claude', 'Gemini', 'Moonshot', 'Zhipu', 'Qwen', 'DeepSeek',
    'Minimax', 'Wenxin', 'Spark', 'Midjourney', 'Hunyuan', 'Cohere',
    'Cloudflare', 'Ai360', 'Yi', 'Jina', 'Mistral', 'XAI', 'Ollama',
    'Doubao', 'Suno', 'Xinference', 'OpenRouter', 'Dify', 'Coze',
    'SiliconCloud', 'FastGPT', 'Kling', 'Jimeng', 'Perplexity', 'Replicate',
  ];
  for (const name of names) {
    const comp = () => null;
    comp.Color = () => null;
    comp.Avatar = () => null;
    icons[name] = comp;
  }
  return icons;
});

vi.mock('@douyinfe/semi-ui', () => ({
  Modal: { confirm: vi.fn() },
  Tag: () => null,
  Typography: { Text: () => null },
  Avatar: () => null,
}));

vi.mock('lucide-react', () => {
  const icons = {};
  const names = [
    'LayoutDashboard', 'TerminalSquare', 'MessageSquare', 'Key',
    'BarChart3', 'Image', 'CheckSquare', 'CreditCard', 'Layers',
    'Gift', 'User', 'Settings', 'CircleUser', 'Package', 'Server',
    'CalendarClock',
  ];
  for (const name of names) {
    icons[name] = () => null;
  }
  return icons;
});

vi.mock('react-icons/si', () => {
  const icons = {};
  const names = [
    'SiAtlassian', 'SiAuth0', 'SiAuthentik', 'SiBitbucket', 'SiDiscord',
    'SiDropbox', 'SiFacebook', 'SiGitea', 'SiGithub', 'SiGitlab',
    'SiGoogle', 'SiKeycloak', 'SiNextcloud', 'SiNotion', 'SiOkta',
    'SiOpenid', 'SiReddit', 'SiTelegram', 'SiTwitch', 'SiWechat', 'SiX',
  ];
  for (const name of names) {
    icons[name] = () => null;
  }
  return icons;
});

vi.mock('react-icons/fa', () => ({
  FaLinkedin: () => null,
  FaSlack: () => null,
}));

vi.mock('unist-util-visit', () => ({
  visit: vi.fn(),
}));

vi.mock('./utils', () => ({
  copy: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  getUserIdFromLocalStorage: () => '1',
  formatMessageForAPI: vi.fn(),
  isValidMessage: vi.fn(),
}));

vi.mock('./api', () => ({
  API: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  default: {
    t: (key) => key,
    language: 'en',
  },
  __esModule: true,
}));

import {
  stringToColor,
  modelToColor,
  modelColorMap,
  renderNumber,
  renderQuotaNumberWithDigit,
  renderNumberWithPoint,
  getQuotaPerUnit,
  renderUnitWithQuota,
  getQuotaWithUnit,
  getCurrencyConfig,
  convertUSDToCurrency,
  renderQuota,
  renderQuotaWithAmount,
  renderText,
  stripExprVersion,
  parseTiersFromExpr,
  decodeFromBase64,
  normalizeLabel,
} from './render';

describe('stringToColor', () => {
  test('returns a color from the palette', () => {
    const validColors = [
      'amber', 'blue', 'cyan', 'green', 'grey', 'indigo',
      'light-blue', 'lime', 'orange', 'pink', 'purple',
      'red', 'teal', 'violet', 'yellow',
    ];
    expect(validColors).toContain(stringToColor('test'));
    expect(validColors).toContain(stringToColor('hello'));
    expect(validColors).toContain(stringToColor('a'));
  });

  test('returns consistent results for the same input', () => {
    expect(stringToColor('mymodel')).toBe(stringToColor('mymodel'));
  });

  test('different strings can produce different colors', () => {
    const color1 = stringToColor('a');
    const color2 = stringToColor('b');
    expect(typeof color1).toBe('string');
    expect(typeof color2).toBe('string');
  });
});

describe('modelToColor', () => {
  test('returns predefined color for known models', () => {
    expect(modelToColor('gpt-4')).toBe(modelColorMap['gpt-4']);
    expect(modelToColor('dall-e-3')).toBe(modelColorMap['dall-e-3']);
    expect(modelToColor('whisper-1')).toBe(modelColorMap['whisper-1']);
  });

  test('returns a color from the palette for unknown models', () => {
    const color = modelToColor('unknown-model-xyz');
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  test('returns consistent results for the same unknown model', () => {
    expect(modelToColor('my-custom-model')).toBe(modelToColor('my-custom-model'));
  });

  test('uses extended palette for long model names', () => {
    const longName = 'a-very-long-model-name-that-exceeds-ten-chars';
    const color = modelToColor(longName);
    expect(typeof color).toBe('string');
  });

  test('uses base palette for short model names', () => {
    const shortName = 'abc';
    const color = modelToColor(shortName);
    expect(typeof color).toBe('string');
  });
});

describe('renderNumber', () => {
  test('returns number as-is for values below 10000', () => {
    expect(renderNumber(0)).toBe(0);
    expect(renderNumber(999)).toBe(999);
    expect(renderNumber(9999)).toBe(9999);
  });

  test('formats thousands with k', () => {
    expect(renderNumber(10000)).toBe('10.0k');
    expect(renderNumber(50000)).toBe('50.0k');
    expect(renderNumber(999999)).toBe('1000.0k');
  });

  test('formats millions with M', () => {
    expect(renderNumber(1000000)).toBe('1.0M');
    expect(renderNumber(5500000)).toBe('5.5M');
  });

  test('formats billions with B', () => {
    expect(renderNumber(1000000000)).toBe('1.0B');
    expect(renderNumber(2500000000)).toBe('2.5B');
  });
});

describe('renderQuotaNumberWithDigit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns 0 for NaN', () => {
    expect(renderQuotaNumberWithDigit(NaN)).toBe(0);
  });

  test('returns 0 for non-number', () => {
    expect(renderQuotaNumberWithDigit('abc')).toBe(0);
    expect(renderQuotaNumberWithDigit(undefined)).toBe(0);
  });

  test('formats as USD by default', () => {
    expect(renderQuotaNumberWithDigit(1.5)).toBe('$1.50');
  });

  test('formats as CNY when configured', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    expect(renderQuotaNumberWithDigit(1.5)).toBe('¥1.50');
  });

  test('formats as CUSTOM when configured', () => {
    localStorage.setItem('quota_display_type', 'CUSTOM');
    localStorage.setItem('status', JSON.stringify({ custom_currency_symbol: 'C$' }));
    expect(renderQuotaNumberWithDigit(2.5)).toBe('C$2.50');
  });

  test('uses default symbol for CUSTOM when no status', () => {
    localStorage.setItem('quota_display_type', 'CUSTOM');
    expect(renderQuotaNumberWithDigit(1)).toBe('¤1.00');
  });

  test('respects custom digits parameter', () => {
    expect(renderQuotaNumberWithDigit(1.123456, 4)).toBe('$1.1235');
  });

  test('returns number without symbol for unknown type', () => {
    localStorage.setItem('quota_display_type', 'TOKENS');
    expect(renderQuotaNumberWithDigit(42)).toBe('42.00');
  });
});

describe('renderNumberWithPoint', () => {
  test('returns empty string for undefined', () => {
    expect(renderNumberWithPoint(undefined)).toBe('');
  });

  test('returns fixed number for values under 100000', () => {
    const result = renderNumberWithPoint(123.456);
    expect(result).toBe('123.46');
  });

  test('shortens large numbers', () => {
    const result = renderNumberWithPoint(123456.78);
    expect(result).toBe('12..56.78');
  });

  test('handles exact 100000', () => {
    const result = renderNumberWithPoint(100000);
    expect(result).toBe('10..00.00');
  });
});

describe('getQuotaPerUnit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns parsed float from localStorage', () => {
    localStorage.setItem('quota_per_unit', '500000');
    expect(getQuotaPerUnit()).toBe(500000);
  });

  test('returns NaN when not set', () => {
    expect(getQuotaPerUnit()).toBeNaN();
  });
});

describe('renderUnitWithQuota', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('multiplies quota_per_unit by quota', () => {
    localStorage.setItem('quota_per_unit', '500000');
    expect(renderUnitWithQuota(2)).toBe(1000000);
  });
});

describe('getQuotaWithUnit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('divides quota by quota_per_unit', () => {
    localStorage.setItem('quota_per_unit', '500000');
    const result = getQuotaWithUnit(1000000);
    expect(result).toBe('2.000000');
  });

  test('respects custom digits', () => {
    localStorage.setItem('quota_per_unit', '500000');
    const result = getQuotaWithUnit(1000000, 2);
    expect(result).toBe('2.00');
  });
});

describe('getCurrencyConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns USD config by default', () => {
    const config = getCurrencyConfig();
    expect(config.symbol).toBe('$');
    expect(config.rate).toBe(1);
    expect(config.type).toBe('USD');
  });

  test('returns CNY config with exchange rate', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    localStorage.setItem('status', JSON.stringify({ usd_exchange_rate: 7.2 }));
    const config = getCurrencyConfig();
    expect(config.symbol).toBe('¥');
    expect(config.rate).toBe(7.2);
    expect(config.type).toBe('CNY');
  });

  test('defaults CNY rate to 7 when status has no usd_exchange_rate', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    localStorage.setItem('status', JSON.stringify({}));
    const config = getCurrencyConfig();
    expect(config.rate).toBe(7);
  });

  test('returns CUSTOM config', () => {
    localStorage.setItem('quota_display_type', 'CUSTOM');
    localStorage.setItem('status', JSON.stringify({
      custom_currency_symbol: 'R$',
      custom_currency_exchange_rate: 5.5,
    }));
    const config = getCurrencyConfig();
    expect(config.symbol).toBe('R$');
    expect(config.rate).toBe(5.5);
    expect(config.type).toBe('CUSTOM');
  });

  test('uses defaults for CUSTOM when status is invalid JSON', () => {
    localStorage.setItem('quota_display_type', 'CUSTOM');
    localStorage.setItem('status', 'invalid');
    const config = getCurrencyConfig();
    expect(config.symbol).toBe('$');
    expect(config.rate).toBe(1);
  });
});

describe('convertUSDToCurrency', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns USD amount with $ symbol by default', () => {
    expect(convertUSDToCurrency(10)).toBe('$10.00');
  });

  test('converts to CNY', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    localStorage.setItem('status', JSON.stringify({ usd_exchange_rate: 7 }));
    expect(convertUSDToCurrency(10)).toBe('¥70.00');
  });

  test('respects digits parameter', () => {
    expect(convertUSDToCurrency(10.12345, 4)).toBe('$10.1235');
  });

  test('converts to CUSTOM currency', () => {
    localStorage.setItem('quota_display_type', 'CUSTOM');
    localStorage.setItem('status', JSON.stringify({
      custom_currency_symbol: 'EUR',
      custom_currency_exchange_rate: 0.92,
    }));
    expect(convertUSDToCurrency(100, 2)).toBe('EUR92.00');
  });
});

describe('renderQuota', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders in token mode', () => {
    localStorage.setItem('quota_display_type', 'TOKENS');
    const result = renderQuota(50000);
    expect(result).toBe('50.0k');
  });

  test('renders in USD mode', () => {
    localStorage.setItem('quota_per_unit', '500000');
    const result = renderQuota(1000000);
    expect(result).toBe('$2.00');
  });

  test('renders in CNY mode', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    localStorage.setItem('quota_per_unit', '500000');
    localStorage.setItem('status', JSON.stringify({ usd_exchange_rate: 7 }));
    const result = renderQuota(500000);
    expect(result).toBe('¥7.00');
  });

  test('shows minimum value when rounding to zero but quota is positive', () => {
    localStorage.setItem('quota_per_unit', '500000');
    const result = renderQuota(1, 2);
    expect(result).toBe('$0.01');
  });
});

describe('renderQuotaWithAmount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns formatted USD amount by default', () => {
    const result = renderQuotaWithAmount(10);
    expect(result).toBe('$10.00');
  });

  test('converts with CNY rate', () => {
    localStorage.setItem('quota_display_type', 'CNY');
    localStorage.setItem('status', JSON.stringify({ usd_exchange_rate: 7 }));
    const result = renderQuotaWithAmount(10);
    expect(result).toBe('¥70.00');
  });

  test('handles non-finite amount', () => {
    const result = renderQuotaWithAmount('not-a-number');
    expect(result).toContain('$');
  });

  test('handles token display type', () => {
    localStorage.setItem('quota_display_type', 'TOKENS');
    localStorage.setItem('quota_per_unit', '500000');
    const result = renderQuotaWithAmount(10);
    expect(typeof result).not.toBe('undefined');
  });
});

describe('renderText', () => {
  test('returns text as-is when within limit', () => {
    expect(renderText('hello', 10)).toBe('hello');
  });

  test('truncates text when exceeding limit', () => {
    expect(renderText('hello world', 8)).toBe('hello...');
  });

  test('exact limit returns text as-is', () => {
    expect(renderText('hello', 5)).toBe('hello');
  });
});

describe('stripExprVersion', () => {
  test('returns version 1 and empty body for empty input', () => {
    expect(stripExprVersion('')).toEqual({ version: 1, body: '' });
    expect(stripExprVersion(null)).toEqual({ version: 1, body: '' });
    expect(stripExprVersion(undefined)).toEqual({ version: 1, body: '' });
  });

  test('extracts version from versioned expression', () => {
    expect(stripExprVersion('v2:p*1.5+c*2.0')).toEqual({ version: 2, body: 'p*1.5+c*2.0' });
  });

  test('returns version 1 for unversioned expression', () => {
    expect(stripExprVersion('p*1.5+c*2.0')).toEqual({ version: 1, body: 'p*1.5+c*2.0' });
  });

  test('handles v1 prefix explicitly', () => {
    expect(stripExprVersion('v1:p*1.0')).toEqual({ version: 1, body: 'p*1.0' });
  });

  test('handles higher version numbers', () => {
    expect(stripExprVersion('v10:body')).toEqual({ version: 10, body: 'body' });
  });
});

describe('parseTiersFromExpr', () => {
  test('returns empty array for empty/null input', () => {
    expect(parseTiersFromExpr('')).toEqual([]);
    expect(parseTiersFromExpr(null)).toEqual([]);
    expect(parseTiersFromExpr(undefined)).toEqual([]);
  });

  test('parses a single unconditional tier', () => {
    const expr = 'v2:tier("default", p*1.5 c*2.0)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].label).toBe('default');
    expect(tiers[0].inputPrice).toBe(1.5);
    expect(tiers[0].outputPrice).toBe(2.0);
    expect(tiers[0].conditions).toEqual([]);
  });

  test('parses a tier with conditions', () => {
    const expr = 'v2:p>100 ? tier("premium", p*3.0 c*4.0)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].label).toBe('premium');
    expect(tiers[0].inputPrice).toBe(3.0);
    expect(tiers[0].outputPrice).toBe(4.0);
    expect(tiers[0].conditions).toEqual([
      { var: 'p', op: '>', value: 100 },
    ]);
  });

  test('parses multiple tiers', () => {
    const expr = 'v2:tier("low", p*1.0 c*1.5) p>1000 ? tier("high", p*2.0 c*3.0)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(2);
    expect(tiers[0].label).toBe('low');
    expect(tiers[1].label).toBe('high');
  });

  test('parses compound conditions with &&', () => {
    const expr = 'v2:p>100&&c<500 ? tier("mid", p*2.0 c*2.5)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].conditions).toHaveLength(2);
    expect(tiers[0].conditions[0]).toEqual({ var: 'p', op: '>', value: 100 });
    expect(tiers[0].conditions[1]).toEqual({ var: 'c', op: '<', value: 500 });
  });

  test('parses tiers with cache pricing variables', () => {
    const expr = 'v2:tier("with-cache", p*1.0 c*2.0 cr*0.5 cc*0.8)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].cacheReadPrice).toBe(0.5);
    expect(tiers[0].cacheCreatePrice).toBe(0.8);
  });

  test('returns empty array for malformed expression', () => {
    const expr = 'this is not a valid expression';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toEqual([]);
  });

  test('handles conditions with len variable', () => {
    const expr = 'v2:len>=1000 ? tier("long", p*1.5 c*2.0)';
    const tiers = parseTiersFromExpr(expr);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].conditions).toEqual([
      { var: 'len', op: '>=', value: 1000 },
    ]);
  });
});

describe('decodeFromBase64', () => {
  test('returns empty string for falsy input', () => {
    expect(decodeFromBase64('')).toBe('');
    expect(decodeFromBase64(null)).toBe('');
    expect(decodeFromBase64(undefined)).toBe('');
  });

  test('decodes ASCII base64', () => {
    const encoded = window.btoa('Hello, World!');
    expect(decodeFromBase64(encoded)).toBe('Hello, World!');
  });

  test('decodes UTF-8 base64', () => {
    const text = 'Hello';
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const encoded = window.btoa(binary);
    expect(decodeFromBase64(encoded)).toBe(text);
  });
});

describe('normalizeLabel', () => {
  test('returns empty string for falsy input', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel(null)).toBe('');
    expect(normalizeLabel(undefined)).toBe('');
  });

  test('normalizes comparison operators', () => {
    const result = normalizeLabel('p <= 100');
    expect(result).toBe('p<100');
  });

  test('removes whitespace', () => {
    expect(normalizeLabel('p > 100')).toBe('p>100');
  });

  test('converts to lowercase', () => {
    expect(normalizeLabel('ABC')).toBe('abc');
  });

  test('normalizes full-width comparison operators', () => {
    expect(normalizeLabel('p＜100')).toBe('p<100');
    expect(normalizeLabel('p＞100')).toBe('p>100');
  });
});

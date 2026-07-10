import { setStatusData, setUserData } from './data';

beforeEach(() => {
  localStorage.clear();
});

describe('setStatusData', () => {
  test('stores all expected keys in localStorage', () => {
    const data = {
      system_name: 'TestSystem',
      logo: '/test-logo.png',
      footer_html: '<p>footer</p>',
      quota_per_unit: 500000,
      display_in_currency: true,
      quota_display_type: 'CNY',
      enable_drawing: true,
      enable_task: false,
      enable_data_export: true,
      chats: [{ name: 'chat1' }],
      data_export_default_time: 'hour',
      default_collapse_sidebar: false,
      mj_notify_enabled: true,
    };
    setStatusData(data);

    expect(localStorage.getItem('system_name')).toBe('TestSystem');
    expect(localStorage.getItem('logo')).toBe('/test-logo.png');
    expect(localStorage.getItem('footer_html')).toBe('<p>footer</p>');
    expect(localStorage.getItem('quota_per_unit')).toBe('500000');
    expect(localStorage.getItem('display_in_currency')).toBe('true');
    expect(localStorage.getItem('quota_display_type')).toBe('CNY');
    expect(localStorage.getItem('enable_drawing')).toBe('true');
    expect(localStorage.getItem('enable_task')).toBe('false');
    expect(localStorage.getItem('enable_data_export')).toBe('true');
    expect(localStorage.getItem('chats')).toBe(JSON.stringify([{ name: 'chat1' }]));
    expect(localStorage.getItem('data_export_default_time')).toBe('hour');
    expect(localStorage.getItem('default_collapse_sidebar')).toBe('false');
    expect(localStorage.getItem('mj_notify_enabled')).toBe('true');
    expect(JSON.parse(localStorage.getItem('status'))).toEqual(data);
  });

  test('defaults quota_display_type to USD when not provided', () => {
    setStatusData({});
    expect(localStorage.getItem('quota_display_type')).toBe('USD');
  });

  test('stores docs_link when provided', () => {
    setStatusData({ docs_link: 'https://docs.example.com' });
    expect(localStorage.getItem('docs_link')).toBe('https://docs.example.com');
  });

  test('removes docs_link when not provided', () => {
    localStorage.setItem('docs_link', 'old-link');
    setStatusData({});
    expect(localStorage.getItem('docs_link')).toBeNull();
  });

  test('removes chat_link when not provided', () => {
    localStorage.setItem('chat_link', 'old-link');
    setStatusData({});
    expect(localStorage.getItem('chat_link')).toBeNull();
  });

  test('removes chat_link2 when not provided', () => {
    localStorage.setItem('chat_link2', 'old-link');
    setStatusData({});
    expect(localStorage.getItem('chat_link2')).toBeNull();
  });
});

describe('setUserData', () => {
  test('stores user data as JSON string', () => {
    const data = { id: 1, username: 'admin', role: 100 };
    setUserData(data);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(data);
  });

  test('overwrites previous user data', () => {
    setUserData({ id: 1 });
    setUserData({ id: 2 });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 2 });
  });
});

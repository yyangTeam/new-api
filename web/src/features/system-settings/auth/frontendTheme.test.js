import { confirmSwitchToDefaultFrontend } from './frontendTheme';

vi.mock('@douyinfe/semi-ui', () => ({
  Modal: {
    confirm: vi.fn(),
  },
}));

vi.mock('./api', () => ({
  API: {
    put: vi.fn(),
  },
}));

vi.mock('./utils', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

describe('confirmSwitchToDefaultFrontend', () => {
  test('is an exported function', () => {
    expect(typeof confirmSwitchToDefaultFrontend).toBe('function');
  });

  test('calls Modal.confirm with translated strings', async () => {
    const { Modal } = await import('@douyinfe/semi-ui');
    const t = (key) => key;
    confirmSwitchToDefaultFrontend(t);
    expect(Modal.confirm).toHaveBeenCalledTimes(1);
    const callArgs = Modal.confirm.mock.calls[0][0];
    expect(callArgs.title).toBe('切换到新版前端');
    expect(callArgs.okText).toBe('确认切换');
    expect(callArgs.cancelText).toBe('取消');
    expect(typeof callArgs.onOk).toBe('function');
  });

  test('calls Modal.confirm with custom options', async () => {
    const { Modal } = await import('@douyinfe/semi-ui');
    Modal.confirm.mockClear();
    const t = (key) => `translated:${key}`;
    const onLoadingChange = vi.fn();
    confirmSwitchToDefaultFrontend(t, { onLoadingChange });
    expect(Modal.confirm).toHaveBeenCalledTimes(1);
    const callArgs = Modal.confirm.mock.calls[0][0];
    expect(callArgs.title).toBe('translated:切换到新版前端');
  });
});

import { QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  render as renderWithProviders,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { useHomePageContent } from '@/features/home/hooks'
import { Home } from '@/features/home/index'
import { getTopupInfo } from '@/features/wallet/api'
import type { TopupInfo } from '@/features/wallet/types'
import { useStatus } from '@/hooks/use-status'
import { createAppQueryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { createTestQueryClient } from '@/test/test-utils'

let queryClient: ReturnType<typeof createTestQueryClient>
const topupInfo: TopupInfo = {
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 1,
  stripe_min_topup: 1,
  amount_options: [],
  discount: {},
  topup_link: 'https://cards.example.com/buy?product=api',
  enable_redemption: true,
}

function render(ui: ReactElement) {
  return renderWithProviders(ui, {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    ),
  })
}

vi.mock('@tanstack/react-router', () => ({
  Link: (props: ComponentProps<'a'> & { to: string }) => {
    const { to, ...anchorProps } = props
    return <a href={to} {...anchorProps} />
  },
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: ReactNode }) => <div>{props.children}</div>,
}))

vi.mock('@/components/layout/components/footer', () => ({
  Footer: () => <footer />,
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: { mode: string; content: string }) => (
    <article data-content-mode={props.mode}>{props.content}</article>
  ),
}))

vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

vi.mock('@/features/wallet/api', () => ({ getTopupInfo: vi.fn() }))
vi.mock('@/features/home/hooks', () => ({ useHomePageContent: vi.fn() }))
vi.mock('@/hooks/use-status', () => ({ useStatus: vi.fn() }))

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    useAuthStore.getState().auth.reset()
    vi.mocked(getTopupInfo).mockResolvedValue({
      success: true,
      data: topupInfo,
    })
    vi.mocked(useStatus).mockReturnValue({
      status: {
        system_name: 'Example Gateway',
        docs_link: 'https://docs.example.com',
      },
      loading: false,
      error: null,
    })
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: true,
      isUrl: false,
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    useAuthStore.getState().auth.reset()
  })

  test('keeps a loading state until custom-home content is resolved', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: '',
      isLoaded: false,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('gives anonymous visitors a registration and model-discovery destination', () => {
    render(<Home />)
    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('link', { name: 'Get Started' })
    ).toHaveAttribute('href', '/sign-up')
    expect(
      within(main).getByRole('link', { name: 'Explore models' })
    ).toHaveAttribute('href', '/pricing')
  })

  test('sends an authenticated visitor to the dashboard', () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    expect(
      screen.getByRole('link', { name: 'Go to Dashboard' })
    ).toHaveAttribute('href', '/dashboard')
    expect(
      screen.queryByRole('link', { name: 'Get Started' })
    ).not.toBeInTheDocument()
  })

  test('hides purchase links from anonymous visitors without requesting wallet configuration', () => {
    vi.mocked(useStatus).mockReturnValue({
      status: { topup_link: topupInfo.topup_link, enable_redemption: true },
      loading: false,
      error: null,
    })
    render(<Home />)
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Fuel your next request.' })
    ).not.toBeInTheDocument()
    expect(getTopupInfo).not.toHaveBeenCalled()
  })

  test('shows the wallet purchase destination in both homepage links for signed-in users', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    const purchaseLinks = await screen.findAllByRole('link', {
      name: 'Buy a redemption code',
    })
    expect(purchaseLinks).toHaveLength(2)
    for (const link of purchaseLinks) {
      expect(link).toHaveAttribute('href', topupInfo.topup_link)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.getByRole('link', { name: 'Redeem a code' })).toHaveAttribute(
      'href',
      '/wallet'
    )
    expect(getTopupInfo).toHaveBeenCalledTimes(1)
  })

  test('signing in enables the purchase guide without reloading the homepage', async () => {
    render(<Home />)
    expect(getTopupInfo).not.toHaveBeenCalled()
    act(() => {
      useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    })
    expect(
      await screen.findByRole('region', { name: 'Fuel your next request.' })
    ).toBeInTheDocument()
    expect(getTopupInfo).toHaveBeenCalledTimes(1)
  })

  test('signing out immediately hides a previously loaded purchase guide', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    await screen.findByRole('region', { name: 'Fuel your next request.' })
    act(() => useAuthStore.getState().auth.setUser(null))
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Fuel your next request.' })
    ).not.toBeInTheDocument()
    expect(getTopupInfo).toHaveBeenCalledTimes(1)
  })

  test('a wallet response arriving after sign-out cannot reveal purchase links', async () => {
    let resolveRequest!: (
      response: Awaited<ReturnType<typeof getTopupInfo>>
    ) => void
    const pendingRequest = new Promise<
      Awaited<ReturnType<typeof getTopupInfo>>
    >((resolve) => {
      resolveRequest = resolve
    })
    vi.mocked(getTopupInfo).mockReturnValue(pendingRequest)
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    await waitFor(() => expect(getTopupInfo).toHaveBeenCalledTimes(1))
    act(() => useAuthStore.getState().auth.setUser(null))
    await act(async () => {
      resolveRequest({ success: true, data: topupInfo })
      await pendingRequest
    })
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Fuel your next request.' })
    ).not.toBeInTheDocument()
  })

  test('switching accounts does not expose the previous account purchase configuration', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'First', role: 1 })
    render(<Home />)
    await screen.findByRole('region', { name: 'Fuel your next request.' })
    vi.mocked(getTopupInfo).mockResolvedValue({
      success: true,
      data: { ...topupInfo, topup_link: 'https://cards.example.com/second' },
    })
    act(() =>
      useAuthStore
        .getState()
        .auth.setUser({ id: 2, username: 'Second', role: 1 })
    )
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    await screen.findByRole('region', { name: 'Fuel your next request.' })
    for (const link of screen.getAllByRole('link', {
      name: 'Buy a redemption code',
    })) {
      expect(link).toHaveAttribute('href', 'https://cards.example.com/second')
    }
    expect(getTopupInfo).toHaveBeenCalledTimes(2)
  })

  test('refreshing the wallet configuration updates both homepage links', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    await screen.findByRole('region', { name: 'Fuel your next request.' })
    vi.mocked(getTopupInfo).mockResolvedValue({
      success: true,
      data: { ...topupInfo, topup_link: 'https://cards.example.com/new' },
    })
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await waitFor(() =>
      expect(
        screen.getAllByRole('link', {
          name: 'Buy a redemption code',
        })[0]
      ).toHaveAttribute('href', 'https://cards.example.com/new')
    )
    for (const link of screen.getAllByRole('link', {
      name: 'Buy a redemption code',
    })) {
      expect(link).toHaveAttribute('href', 'https://cards.example.com/new')
    }
  })

  test.each([
    undefined,
    '',
    'javascript:alert(1)',
    'data:text/html,<h1>Store</h1>',
  ])(
    'hides the purchase guide when the configured link is empty or unsafe: %s',
    async (purchaseLink) => {
      useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
      vi.mocked(getTopupInfo).mockResolvedValue({
        success: true,
        data: { ...topupInfo, topup_link: purchaseLink },
      })
      render(<Home />)
      await waitFor(() => {
        expect(getTopupInfo).toHaveBeenCalledTimes(1)
        expect(queryClient.isFetching()).toBe(0)
      })
      expect(
        screen.queryByRole('link', { name: 'Buy a redemption code' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('region', { name: 'Fuel your next request.' })
      ).not.toBeInTheDocument()
    }
  )

  test('hides the purchase guide when redemption is disabled', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    vi.mocked(getTopupInfo).mockResolvedValue({
      success: true,
      data: { ...topupInfo, enable_redemption: false },
    })
    render(<Home />)
    await waitFor(() => {
      expect(getTopupInfo).toHaveBeenCalledTimes(1)
      expect(queryClient.isFetching()).toBe(0)
    })
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Fuel your next request.' })
    ).not.toBeInTheDocument()
  })

  test.each([
    { success: false, data: topupInfo, message: 'Unavailable' },
    { success: true },
  ])(
    'hides the purchase guide when the wallet response fails or has no data: %j',
    async (response) => {
      useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
      vi.mocked(getTopupInfo).mockResolvedValue(response)
      render(<Home />)
      await waitFor(() => {
        expect(getTopupInfo).toHaveBeenCalledTimes(1)
        expect(queryClient.isFetching()).toBe(0)
      })
      expect(
        screen.queryByRole('link', { name: 'Buy a redemption code' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('region', { name: 'Fuel your next request.' })
      ).not.toBeInTheDocument()
    }
  )

  test('hides a previously loaded guide when refreshing its wallet request fails', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    render(<Home />)
    await screen.findByRole('region', { name: 'Fuel your next request.' })
    vi.mocked(getTopupInfo).mockRejectedValue(new Error('Network unavailable'))
    await act(async () => {
      await queryClient.invalidateQueries()
    })
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Fuel your next request.' })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
    expect(getTopupInfo).toHaveBeenCalledTimes(2)
  })

  test('uses a configured relative purchase link without replacing its destination', async () => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    vi.mocked(getTopupInfo).mockResolvedValue({
      success: true,
      data: { ...topupInfo, topup_link: '/store/codes?pack=starter' },
    })
    render(<Home />)
    const links = await screen.findAllByRole('link', {
      name: 'Buy a redemption code',
    })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/store/codes?pack=starter')
    }
  })

  test('a wallet HTTP 500 hides the optional guide without triggering the application error page', async () => {
    const onInternalServerError = vi.fn()
    queryClient = createAppQueryClient(onInternalServerError)
    useAuthStore.getState().auth.setUser({ id: 1, username: 'Test', role: 1 })
    vi.mocked(getTopupInfo).mockRejectedValue(
      new Error('Wallet unavailable', { cause: { response: { status: 500 } } })
    )
    render(<Home />)
    await waitFor(() => {
      expect(getTopupInfo).toHaveBeenCalledTimes(1)
      expect(queryClient.isFetching()).toBe(0)
    })
    expect(onInternalServerError).not.toHaveBeenCalled()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Fuel your next request.' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Buy a redemption code' })
    ).not.toBeInTheDocument()
  })

  test('keeps the full site name available when the diagram label is shortened', () => {
    const siteName =
      'A long gateway name for multiple applications and development teams'
    vi.mocked(useStatus).mockReturnValue({
      status: { system_name: siteName },
      loading: false,
      error: null,
    })
    render(<Home />)
    expect(
      screen.getByRole('img', {
        name: `AI providers connected through one gateway: ${siteName}`,
      })
    ).toBeInTheDocument()
    expect(screen.getByTitle(siteName)).toHaveTextContent(siteName)
  })

  test('switching protocols changes the visible and copied request together', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    render(<Home />)
    await user.click(screen.getByRole('tab', { name: 'Anthropic' }))
    const example = screen.getByLabelText('Request example')
    expect(example).toHaveTextContent(`${window.location.origin}/v1/messages`)
    expect(example).toHaveTextContent('anthropic-version: 2023-06-01')
    await user.click(
      screen.getByRole('button', { name: 'Copy request example' })
    )
    expect(writeText).toHaveBeenCalledWith(example.textContent)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  test('keyboard selection exposes the Gemini request', async () => {
    const user = userEvent.setup()
    render(<Home />)
    screen.getByRole('tab', { name: 'OpenAI' }).focus()
    await user.keyboard('{End}{Enter}')
    expect(screen.getByRole('tab', { name: 'Gemini' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByLabelText('Request example')).toHaveTextContent(
      '/v1beta/models/your-model:generateContent'
    )
  })

  test('pauses animation by click and resumes it with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Pause animations' }))
    const resume = screen.getByRole('button', { name: 'Resume animations' })
    expect(resume).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('button', { name: 'Pause animations' })
    ).toHaveFocus()
  })

  test.each([
    ['Anthropic', 'Anthropic', '/v1/messages'],
    ['Gemini', 'Gemini', '/v1beta/models/your-model:generateContent'],
  ])(
    'selecting %s in the scene updates the protocol and copied request',
    async (provider, protocol, path) => {
      const user = userEvent.setup()
      const writeText = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue()
      render(<Home />)
      const model = screen.getByRole('button', { name: provider })
      await user.click(model)
      expect(model).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('tab', { name: protocol })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      const request = screen.getByLabelText('Request example')
      expect(request).toHaveTextContent(`${window.location.origin}${path}`)
      await user.click(
        screen.getByRole('button', { name: 'Copy request example' })
      )
      expect(writeText).toHaveBeenLastCalledWith(request.textContent)
      await user.click(
        screen.getByRole('button', { name: 'Copy API base URL' })
      )
      expect(writeText).toHaveBeenLastCalledWith(window.location.origin)
    }
  )

  test('keyboard selection of DeepSeek uses the OpenAI compatible request', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Gemini' }))
    const deepseek = screen.getByRole('button', {
      name: 'DeepSeek',
    })
    deepseek.focus()
    await user.keyboard('{Enter}')
    expect(deepseek).toHaveFocus()
    expect(deepseek).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('tab', { name: 'OpenAI' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByLabelText('Request example')).toHaveTextContent(
      '/v1/chat/completions'
    )
  })

  test('changing a protocol tab also updates the selected provider in the scene', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'DeepSeek' }))
    await user.click(screen.getByRole('tab', { name: 'Anthropic' }))
    expect(screen.getByRole('button', { name: 'Anthropic' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'DeepSeek' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  test('copies the SDK base URL for the selected protocol', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Copy API base URL' }))
    expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/v1`)
    await user.click(screen.getByRole('tab', { name: 'Anthropic' }))
    await user.click(screen.getByRole('button', { name: 'Copy API base URL' }))
    expect(writeText).toHaveBeenLastCalledWith(window.location.origin)
  })

  test.each(['https://docs.example.com', '/integration-guide'])(
    'uses configured documentation destination %s',
    (docsUrl) => {
      vi.mocked(useStatus).mockReturnValue({
        status: { docs_link: docsUrl },
        loading: false,
        error: null,
      })
      render(<Home />)
      expect(
        screen.getByRole('link', { name: 'Read the integration guide' })
      ).toHaveAttribute('href', docsUrl)
    }
  )

  test('keeps the custom iframe URL and its sandbox', () => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content: 'https://example.com/custom-home',
      isLoaded: true,
      isUrl: true,
    })
    render(<Home />)
    const iframe = screen.getByTitle('Custom Home Page')
    expect(iframe).toHaveAttribute('src', 'https://example.com/custom-home')
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation'
    )
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  test.each([
    ['<html><body><h1>Custom</h1></body></html>', 'html'],
    ['# Welcome\n\nMarkdown content here.', 'markdown'],
  ])('keeps custom content rendering in %s mode', (content, mode) => {
    vi.mocked(useHomePageContent).mockReturnValue({
      content,
      isLoaded: true,
      isUrl: false,
    })
    render(<Home />)
    expect(screen.getByRole('article')).toHaveAttribute(
      'data-content-mode',
      mode
    )
    expect(screen.getByRole('article')).toHaveTextContent(
      content.replaceAll(/\s+/g, ' ')
    )
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})

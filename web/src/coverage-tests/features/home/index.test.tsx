import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactNode } from 'react'

import { useHomePageContent } from '@/features/home/hooks'
import { Home } from '@/features/home/index'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

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

vi.mock('@/stores/auth-store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/features/home/hooks', () => ({ useHomePageContent: vi.fn() }))
vi.mock('@/hooks/use-status', () => ({ useStatus: vi.fn() }))

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      auth: { user: null },
    } as ReturnType<typeof useAuthStore>)
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
    vi.mocked(useAuthStore).mockReturnValue({
      auth: { user: { id: 1, username: 'Test' } },
    } as ReturnType<typeof useAuthStore>)
    render(<Home />)
    expect(
      screen.getByRole('link', { name: 'Go to Dashboard' })
    ).toHaveAttribute('href', '/dashboard')
    expect(
      screen.queryByRole('link', { name: 'Get Started' })
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
      expect(
        screen.getByRole('tab', { name: protocol })
      ).toHaveAttribute('aria-selected', 'true')
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
    await user.click(
      screen.getByRole('button', { name: 'Gemini' })
    )
    const deepseek = screen.getByRole('button', {
      name: 'DeepSeek',
    })
    deepseek.focus()
    await user.keyboard('{Enter}')
    expect(deepseek).toHaveFocus()
    expect(deepseek).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('tab', { name: 'OpenAI' })
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Request example')).toHaveTextContent(
      '/v1/chat/completions'
    )
  })

  test('changing a protocol tab also updates the selected provider in the scene', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(
      screen.getByRole('button', { name: 'DeepSeek' })
    )
    await user.click(
      screen.getByRole('tab', { name: 'Anthropic' })
    )
    expect(
      screen.getByRole('button', { name: 'Anthropic' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'DeepSeek' })
    ).toHaveAttribute('aria-pressed', 'false')
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

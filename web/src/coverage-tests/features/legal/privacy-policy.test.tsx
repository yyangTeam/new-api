import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: any) => (
    <div data-testid='public-layout'>{children}</div>
  ),
}))

vi.mock('@/components/rich-content', () => ({
  RichContent: (props: any) => (
    <div data-testid='rich-content' data-mode={props.mode}>
      {props.content}
    </div>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid='skeleton' className={props.className} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, render: renderProp }: any) => {
    if (renderProp) return <span>{renderProp}{children}</span>
    return <button>{children}</button>
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

vi.mock('@/features/legal/api', () => ({
  getPrivacyPolicy: vi.fn().mockResolvedValue({ success: true, data: '# Privacy Policy content' }),
  getUserAgreement: vi.fn(),
}))

import { PrivacyPolicy } from '@/features/legal/privacy-policy'

describe('PrivacyPolicy', () => {
  test('renders LegalDocument with correct title', async () => {
    render(<PrivacyPolicy />)
    // The component passes title='Privacy Policy' to LegalDocument
    // In markdown mode, the title is rendered as heading text
    expect(await screen.findByText('Privacy Policy')).toBeInTheDocument()
  })
})

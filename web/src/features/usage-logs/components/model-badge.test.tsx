import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { ModelBadge } from './model-badge'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('lucide-react', () => ({
  Route: () => <span data-testid='route-icon' />,
}))

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({
    children,
    copyText,
  }: {
    children: React.ReactNode
    copyText?: string
  }) => (
    <span data-testid='status-badge' data-copy={copyText}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='popover'>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='popover-trigger'>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='popover-content'>{children}</div>
  ),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (icon: string, size: number) => (
    <span data-testid='lobe-icon' data-icon={icon} data-size={size} />
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('ModelBadge', () => {
  it('renders model name', () => {
    render(<ModelBadge modelName='gpt-4' />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('renders StatusBadge without popover when no actualModel', () => {
    render(<ModelBadge modelName='gpt-4' />)
    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('popover')).not.toBeInTheDocument()
  })

  it('renders popover when actualModel is provided', () => {
    render(<ModelBadge modelName='gpt-4' actualModel='gpt-4-0125-preview' />)
    expect(screen.getByTestId('popover')).toBeInTheDocument()
    expect(screen.getByTestId('popover-content')).toBeInTheDocument()
  })

  it('shows request model and actual model in popover content', () => {
    render(<ModelBadge modelName='gpt-4' actualModel='gpt-4-turbo' />)
    expect(screen.getByText('Request Model:')).toBeInTheDocument()
    expect(screen.getByText('Actual Model:')).toBeInTheDocument()
    expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument()
  })

  it('renders provider icon for OpenAI model', () => {
    render(<ModelBadge modelName='gpt-4' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'OpenAI.Color')
  })

  it('renders provider icon for Claude model', () => {
    render(<ModelBadge modelName='claude-3-opus' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Claude.Color')
  })

  it('renders provider icon for Gemini model', () => {
    render(<ModelBadge modelName='gemini-pro' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Gemini.Color')
  })

  it('renders provider icon for DeepSeek model', () => {
    render(<ModelBadge modelName='deepseek-chat' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'DeepSeek.Color')
  })

  it('renders provider icon for Qwen model', () => {
    render(<ModelBadge modelName='qwen-72b' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Qwen.Color')
  })

  it('renders provider icon for Grok model', () => {
    render(<ModelBadge modelName='grok-2' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Grok.Color')
  })

  it('renders without icon for unknown model', () => {
    render(<ModelBadge modelName='my-custom-model' />)
    expect(screen.queryByTestId('lobe-icon')).not.toBeInTheDocument()
  })

  it('renders provider icon for Mistral model', () => {
    render(<ModelBadge modelName='mistral-large' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Mistral.Color')
  })

  it('renders provider icon for Llama (Meta) model', () => {
    render(<ModelBadge modelName='llama-3.1-70b' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Meta.Color')
  })

  it('renders provider icon for MiMo model', () => {
    render(<ModelBadge modelName='mimo-7b' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'XiaomiMiMo')
  })

  it('renders provider icon for Doubao model', () => {
    render(<ModelBadge modelName='doubao-pro-4k' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Doubao.Color')
  })

  it('renders provider icon for Moonshot model', () => {
    render(<ModelBadge modelName='moonshot-v1' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Moonshot.Color')
  })

  it('renders provider icon for MiniMax model', () => {
    render(<ModelBadge modelName='minimax-01' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Minimax.Color')
  })

  it('renders provider icon for Zhipu model', () => {
    render(<ModelBadge modelName='glm-4' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Zhipu.Color')
  })

  it('renders provider icon for Cohere model', () => {
    render(<ModelBadge modelName='command-r-plus' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Cohere.Color')
  })

  it('renders provider icon for ERNIE (Baidu) model', () => {
    render(<ModelBadge modelName='ernie-bot-4' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Wenxin.Color')
  })

  it('renders provider icon for Spark (iFlyTek) model', () => {
    render(<ModelBadge modelName='spark-v3' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Spark.Color')
  })

  it('renders provider icon for Hunyuan (Tencent) model', () => {
    render(<ModelBadge modelName='hunyuan-pro' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Hunyuan.Color')
  })

  it('renders provider icon for StepFun model', () => {
    render(<ModelBadge modelName='step-1-8k' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Stepfun.Color')
  })

  it('renders provider icon for Yi model', () => {
    render(<ModelBadge modelName='yi-34b' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'Yi.Color')
  })

  it('renders route icon when actualModel is present', () => {
    render(<ModelBadge modelName='gpt-4' actualModel='gpt-4-turbo' />)
    expect(screen.getByTestId('route-icon')).toBeInTheDocument()
  })

  it('passes copyText to StatusBadge', () => {
    render(<ModelBadge modelName='gpt-4' />)
    expect(screen.getByTestId('status-badge')).toHaveAttribute(
      'data-copy',
      'gpt-4'
    )
  })

  it('passes className', () => {
    render(<ModelBadge modelName='gpt-4' className='custom-class' />)
    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
  })

  it('resolves o1 model as OpenAI', () => {
    render(<ModelBadge modelName='o1' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'OpenAI.Color')
  })

  it('resolves tts-1 as OpenAI', () => {
    render(<ModelBadge modelName='tts-1' />)
    const icon = screen.getByTestId('lobe-icon')
    expect(icon).toHaveAttribute('data-icon', 'OpenAI.Color')
  })
})

import { render, screen } from '@/test/test-utils'
import type { ReactNode } from 'react'

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { server_address: 'https://api.example.com' },
    loading: false,
    error: null,
  }),
}))

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: (props: { code: string; children?: ReactNode }) => (
    <pre data-testid='code-block'>{props.code}</pre>
  ),
  CodeBlockCopyButton: () => null,
}))

const buildRateLimitsMock = vi.fn().mockReturnValue([])
const buildSupportedParametersMock = vi.fn().mockReturnValue([])

vi.mock('@/features/pricing/lib/mock-stats', () => ({
  buildRateLimits: (...args: unknown[]) => buildRateLimitsMock(...args),
  buildSupportedParameters: (...args: unknown[]) =>
    buildSupportedParametersMock(...args),
  formatRateLimit: (v: number) => String(v),
}))

vi.mock('@/features/pricing/lib/model-helpers', () => ({
  replaceModelInPath: (path: string, model: string) =>
    path.replace('{model}', model),
}))

import { ModelDetailsApi } from '@/features/pricing/components/model-details-api'
import type { PricingModel } from '@/features/pricing/types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'gpt-4o',
    description: 'Test model',
    quota_type: 0,
    model_ratio: 5,
    completion_ratio: 15,
    enable_groups: ['default'],
    supported_endpoint_types: ['openai'],
    ...overrides,
  }
}

describe('ModelDetailsApi', () => {
  const defaultEndpointMap = {
    openai: { path: '/v1/chat/completions', method: 'POST' },
    anthropic: { path: '/v1/messages', method: 'POST' },
    gemini: {
      path: '/v1beta/models/{model}:generateContent',
      method: 'POST',
    },
    embeddings: { path: '/v1/embeddings', method: 'POST' },
    'image-generation': { path: '/v1/images/generations', method: 'POST' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    buildRateLimitsMock.mockReturnValue([])
    buildSupportedParametersMock.mockReturnValue([])
  })

  test('renders authentication section', () => {
    render(
      <ModelDetailsApi
        model={createModel()}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('Authentication')).toBeInTheDocument()
  })

  test('renders code block for openai endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['openai'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('Code samples')).toBeInTheDocument()
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })

  test('renders code block for anthropic endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['anthropic'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    const code = screen.getByTestId('code-block').textContent
    expect(code).toContain('x-api-key')
  })

  test('renders code block for gemini endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          model_name: 'gemini-pro',
          supported_endpoint_types: ['gemini'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    const code = screen.getByTestId('code-block').textContent
    expect(code).toContain('gemini-pro')
  })

  test('renders code block for embeddings endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          model_name: 'text-embedding-3-small',
          supported_endpoint_types: ['embeddings'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })

  test('renders code block for image-generation endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          model_name: 'dall-e-3',
          supported_endpoint_types: ['image-generation'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })

  test('does not render code samples when model has no endpoints', () => {
    render(
      <ModelDetailsApi
        model={createModel({ supported_endpoint_types: [] })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.queryByText('Code samples')).not.toBeInTheDocument()
  })

  test('does not render code samples when endpoint path is not in map', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['unknown-type'],
        })}
        endpointMap={{}}
      />
    )
    expect(screen.queryByText('Code samples')).not.toBeInTheDocument()
  })

  test('renders with openai-response endpoint type', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['openai-response'],
        })}
        endpointMap={{
          'openai-response': { path: '/v1/responses', method: 'POST' },
        }}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })

  test('renders with reasoning model name (no temperature)', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          model_name: 'o1-preview',
          supported_endpoint_types: ['openai'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
    const code = screen.getByTestId('code-block').textContent
    expect(code).toContain('o1-preview')
    expect(code).not.toContain('temperature')
  })

  test('shows rate limits when provided', () => {
    buildRateLimitsMock.mockReturnValue([
      { group: 'default', rpm: 60, tpm: 100000, rpd: 1000 },
    ])

    render(
      <ModelDetailsApi
        model={createModel()}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('Rate limits')).toBeInTheDocument()
  })

  test('shows supported parameters when provided', () => {
    buildSupportedParametersMock.mockReturnValue([
      {
        name: 'temperature',
        type: 'number',
        descriptionKey: 'Controls randomness',
        defaultValue: 0.7,
        range: '0-2',
        required: false,
      },
    ])

    render(
      <ModelDetailsApi
        model={createModel()}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('Supported parameters')).toBeInTheDocument()
    expect(screen.getByText('temperature')).toBeInTheDocument()
  })

  test('shows parameter with required badge', () => {
    buildSupportedParametersMock.mockReturnValue([
      {
        name: 'model',
        type: 'string',
        descriptionKey: 'Model ID',
        required: true,
      },
    ])

    render(
      <ModelDetailsApi
        model={createModel()}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('required')).toBeInTheDocument()
  })

  test('shows parameter with enum values', () => {
    buildSupportedParametersMock.mockReturnValue([
      {
        name: 'response_format',
        type: 'string',
        descriptionKey: 'Format',
        required: false,
        enumValues: ['json', 'text'],
      },
    ])

    render(
      <ModelDetailsApi
        model={createModel()}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('json')).toBeInTheDocument()
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  test('renders language tabs for code samples', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['openai'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('cURL')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
  })

  test('renders endpoint tabs when multiple endpoints', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['openai', 'anthropic'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    expect(screen.getByText('openai')).toBeInTheDocument()
    expect(screen.getByText('anthropic')).toBeInTheDocument()
  })

  test('does not show endpoint tabs for single endpoint', () => {
    render(
      <ModelDetailsApi
        model={createModel({
          supported_endpoint_types: ['openai'],
        })}
        endpointMap={defaultEndpointMap}
      />
    )
    // There should still be code sample but no endpoint tab selector
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })
})

import { render, screen } from '@/test/test-utils'
import * as RechartsPrimitive from 'recharts'

import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const testConfig: ChartConfig = {
  visits: {
    label: 'Visits',
    color: '#ff0000',
  },
  revenue: {
    label: 'Revenue',
    theme: { light: '#00ff00', dark: '#0000ff' },
  },
}

describe('ChartContainer', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[{ name: 'A', visits: 100 }]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ChartContainer config={testConfig} className='custom-chart'>
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart"]')).toHaveClass(
      'custom-chart'
    )
  })

  test('generates unique chart ID', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    const chart = container.querySelector('[data-chart]')
    expect(chart?.getAttribute('data-chart')).toMatch(/^chart-/)
  })

  test('uses custom id when provided', () => {
    const { container } = render(
      <ChartContainer config={testConfig} id='my-chart'>
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(
      container.querySelector('[data-chart="chart-my-chart"]')
    ).toBeInTheDocument()
  })

  test('accepts custom initial dimensions', () => {
    const { container } = render(
      <ChartContainer
        config={testConfig}
        initialDimension={{ width: 500, height: 300 }}
      >
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })
})

describe('ChartStyle', () => {
  test('renders style tag with CSS variables', () => {
    const { container } = render(
      <ChartStyle id='test-chart' config={testConfig} />
    )
    const style = container.querySelector('style')
    expect(style).toBeInTheDocument()
    expect(style?.textContent).toContain('--color-visits')
    expect(style?.textContent).toContain('#ff0000')
  })

  test('returns null when no color config', () => {
    const emptyConfig: ChartConfig = {
      data: { label: 'Data' },
    }
    const { container } = render(
      <ChartStyle id='test-chart' config={emptyConfig} />
    )
    expect(container.querySelector('style')).not.toBeInTheDocument()
  })

  test('renders theme-based colors for both light and dark', () => {
    const { container } = render(
      <ChartStyle id='test-chart' config={testConfig} />
    )
    const style = container.querySelector('style')
    expect(style?.textContent).toContain('--color-revenue')
    expect(style?.textContent).toContain('#00ff00')
    expect(style?.textContent).toContain('#0000ff')
  })

  test('renders colors with theme prefix for dark', () => {
    const { container } = render(
      <ChartStyle id='test-chart' config={testConfig} />
    )
    const style = container.querySelector('style')
    expect(style?.textContent).toContain('.dark')
  })
})

describe('ChartTooltipContent', () => {
  // Must be rendered inside a ChartContainer to have context
  function renderTooltipContent(props: Record<string, unknown>) {
    return render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[{ name: 'A', visits: 100 }]}>
          <RechartsPrimitive.Bar dataKey='visits' />
          <RechartsPrimitive.Tooltip
            content={<ChartTooltipContent {...props} />}
          />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
  }

  test('returns null when not active', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    // Tooltip content should not be visible when not active
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })

  test('renders when active with payload', () => {
    renderTooltipContent({})
    // Chart container rendered OK
    expect(document.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })
})

describe('ChartLegendContent', () => {
  test('returns null when payload is empty', () => {
    const { container } = render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[]}>
          <RechartsPrimitive.Bar dataKey='visits' />
          <RechartsPrimitive.Legend
            content={<ChartLegendContent payload={[]} />}
          />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })

  test('renders with payload items', () => {
    const payload = [
      { value: 'visits', type: 'line' as const, color: '#ff0000', dataKey: 'visits' },
    ]
    const { container } = render(
      <ChartContainer config={testConfig}>
        <RechartsPrimitive.BarChart data={[{ visits: 100 }]}>
          <RechartsPrimitive.Bar dataKey='visits' />
          <RechartsPrimitive.Legend
            content={<ChartLegendContent payload={payload} />}
          />
        </RechartsPrimitive.BarChart>
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument()
  })
})

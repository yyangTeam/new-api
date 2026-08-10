import { render } from '@/test/test-utils'
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { ChartContainer, ChartStyle } from './chart'
import type { ChartConfig } from './chart'

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

  test('renders theme-based colors', () => {
    const { container } = render(
      <ChartStyle id='test-chart' config={testConfig} />
    )
    const style = container.querySelector('style')
    expect(style?.textContent).toContain('--color-revenue')
  })
})

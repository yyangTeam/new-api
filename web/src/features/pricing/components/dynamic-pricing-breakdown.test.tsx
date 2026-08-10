import { render, screen } from '@/test/test-utils'

vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: (selector: (s: unknown) => unknown) =>
    selector({
      config: {
        currency: {
          quotaDisplayType: 'USD',
          usdExchangeRate: 7,
          customCurrencySymbol: '',
          customCurrencyExchangeRate: 1,
        },
      },
    }),
}))

vi.mock('../lib/billing-expr', () => ({
  BILLING_PRICING_VARS: [],
  MATCH_CONTAINS: 'contains',
  MATCH_EQ: 'eq',
  MATCH_EXISTS: 'exists',
  MATCH_GTE: 'gte',
  MATCH_LT: 'lt',
  MATCH_RANGE: 'range',
  SOURCE_TIME: 'time',
  normalizeTierLabel: (label?: string) => label?.trim().toLowerCase() ?? '',
  parseTiersFromExpr: () => [],
  splitBillingExprAndRequestRules: (expr: string) => ({
    billingExpr: expr,
    requestRuleExpr: '',
  }),
  tryParseRequestRuleExpr: () => [],
}))

import { DynamicPricingBreakdown } from './dynamic-pricing-breakdown'

describe('DynamicPricingBreakdown', () => {
  test('renders nothing for empty expression', () => {
    const { container } = render(
      <DynamicPricingBreakdown billingExpr='' />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing for null expression', () => {
    const { container } = render(
      <DynamicPricingBreakdown billingExpr={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing for undefined expression', () => {
    const { container } = render(
      <DynamicPricingBreakdown billingExpr={undefined} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders special billing expression for unparseable expression', () => {
    render(
      <DynamicPricingBreakdown billingExpr='totally_invalid_expression' />
    )
    expect(
      screen.getByText('Special billing expression')
    ).toBeInTheDocument()
    expect(screen.getByText('Raw expression')).toBeInTheDocument()
  })

  test('renders raw expression text', () => {
    render(
      <DynamicPricingBreakdown billingExpr='some_custom_expr' />
    )
    expect(screen.getByText('some_custom_expr')).toBeInTheDocument()
  })

  test('renders in compact mode without icon header', () => {
    render(
      <DynamicPricingBreakdown
        billingExpr='unparseable_expr'
        compact={true}
      />
    )
    expect(screen.getByText('Raw expression')).toBeInTheDocument()
    // In compact mode, the icon header "Special billing expression" should not appear
    // but the raw expression section should still be there
  })

  test('renders full mode with icon header', () => {
    render(
      <DynamicPricingBreakdown
        billingExpr='unparseable_expr'
        compact={false}
      />
    )
    expect(
      screen.getByText('Special billing expression')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Unable to parse structured pricing')
    ).toBeInTheDocument()
  })
})

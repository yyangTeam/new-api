import { render, screen } from '@/test/test-utils'

import {
  sideDrawerContentClassName,
  sideDrawerHeaderClassName,
  sideDrawerFormClassName,
  sideDrawerFooterClassName,
  sideDrawerSectionClassName,
  sideDrawerSwitchItemClassName,
  SideDrawerSection,
  SideDrawerSectionHeader,
} from './drawer-layout'

describe('drawer-layout classNames', () => {
  test('sideDrawerContentClassName returns base classes', () => {
    const result = sideDrawerContentClassName()
    expect(result).toContain('bg-background')
    expect(result).toContain('flex')
  })

  test('sideDrawerContentClassName merges custom class', () => {
    const result = sideDrawerContentClassName('extra-class')
    expect(result).toContain('extra-class')
  })

  test('sideDrawerHeaderClassName returns base classes', () => {
    const result = sideDrawerHeaderClassName()
    expect(result).toContain('border-b')
  })

  test('sideDrawerHeaderClassName merges custom class', () => {
    const result = sideDrawerHeaderClassName('my-header')
    expect(result).toContain('my-header')
  })

  test('sideDrawerFormClassName returns base classes', () => {
    const result = sideDrawerFormClassName()
    expect(result).toContain('overflow-y-auto')
  })

  test('sideDrawerFormClassName merges custom class', () => {
    const result = sideDrawerFormClassName('my-form')
    expect(result).toContain('my-form')
  })

  test('sideDrawerFooterClassName returns base classes', () => {
    const result = sideDrawerFooterClassName()
    expect(result).toContain('border-t')
  })

  test('sideDrawerFooterClassName merges custom class', () => {
    const result = sideDrawerFooterClassName('my-footer')
    expect(result).toContain('my-footer')
  })

  test('sideDrawerSectionClassName returns base classes', () => {
    const result = sideDrawerSectionClassName()
    expect(result).toContain('border-b')
  })

  test('sideDrawerSectionClassName merges custom class', () => {
    const result = sideDrawerSectionClassName('custom-section')
    expect(result).toContain('custom-section')
  })

  test('sideDrawerSwitchItemClassName returns base classes', () => {
    const result = sideDrawerSwitchItemClassName()
    expect(result).toContain('border-y')
  })

  test('sideDrawerSwitchItemClassName merges custom class', () => {
    const result = sideDrawerSwitchItemClassName('custom-switch')
    expect(result).toContain('custom-switch')
  })
})

describe('SideDrawerSection', () => {
  test('renders children within a section element', () => {
    render(
      <SideDrawerSection>
        <p>Section content</p>
      </SideDrawerSection>
    )
    expect(screen.getByText('Section content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <SideDrawerSection className='my-section'>
        <p>Content</p>
      </SideDrawerSection>
    )
    expect(container.querySelector('section.my-section')).toBeInTheDocument()
  })
})

describe('SideDrawerSectionHeader', () => {
  test('renders title', () => {
    render(<SideDrawerSectionHeader title='Settings' />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(
      <SideDrawerSectionHeader
        title='API Keys'
        description='Manage your API keys'
      />
    )
    expect(screen.getByText('Manage your API keys')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    const { container } = render(
      <SideDrawerSectionHeader title='Title Only' />
    )
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  test('renders icon when provided', () => {
    render(
      <SideDrawerSectionHeader
        title='Keyed'
        icon={<span data-testid='icon'>I</span>}
      />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <SideDrawerSectionHeader title='T' className='header-class' />
    )
    expect(container.querySelector('.header-class')).toBeInTheDocument()
  })
})

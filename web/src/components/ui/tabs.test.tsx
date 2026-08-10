import { render, screen } from '@/test/test-utils'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

describe('Tabs', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content 1</TabsContent>
      </Tabs>
    )
    expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument()
  })

  test('renders with default horizontal orientation', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content 1</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-orientation="horizontal"]')
    ).toBeInTheDocument()
  })

  test('renders with vertical orientation', () => {
    const { container } = render(
      <Tabs defaultValue='tab1' orientation='vertical'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content 1</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-orientation="vertical"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Tabs defaultValue='tab1' className='custom-tabs'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content 1</TabsContent>
      </Tabs>
    )
    expect(container.querySelector('[data-slot="tabs"]')).toHaveClass(
      'custom-tabs'
    )
  })
})

describe('TabsList', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-slot="tabs-list"]')
    ).toBeInTheDocument()
  })

  test('renders with default variant', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-variant="default"]')
    ).toBeInTheDocument()
  })

  test('renders with line variant', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList variant='line'>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-variant="line"]')
    ).toBeInTheDocument()
  })
})

describe('TabsTrigger', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-slot="tabs-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders trigger text', () => {
    render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>My Tab</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('My Tab')).toBeInTheDocument()
  })
})

describe('TabsContent', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Tab content</TabsContent>
      </Tabs>
    )
    expect(
      container.querySelector('[data-slot="tabs-content"]')
    ).toBeInTheDocument()
  })

  test('renders content text', () => {
    render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>Content here</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  test('renders multiple tabs', () => {
    render(
      <Tabs defaultValue='tab1'>
        <TabsList>
          <TabsTrigger value='tab1'>Tab 1</TabsTrigger>
          <TabsTrigger value='tab2'>Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value='tab1'>First</TabsContent>
        <TabsContent value='tab2'>Second</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
  })
})

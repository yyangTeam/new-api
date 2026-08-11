import { render, screen } from '@/test/test-utils'

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

describe('Accordion', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <Accordion defaultValue={['item-1']}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Trigger 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(container.querySelector('[data-slot="accordion"]')).toBeInTheDocument()
  })

  test('renders AccordionItem with data-slot', () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(
      container.querySelector('[data-slot="accordion-item"]')
    ).toBeInTheDocument()
  })

  test('renders AccordionTrigger with data-slot', () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Click me</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(
      container.querySelector('[data-slot="accordion-trigger"]')
    ).toBeInTheDocument()
  })

  test('renders AccordionContent with data-slot', () => {
    const { container } = render(
      <Accordion defaultValue={['item-1']}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Toggle</AccordionTrigger>
          <AccordionContent>Visible content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(
      container.querySelector('[data-slot="accordion-content"]')
    ).toBeInTheDocument()
  })

  test('applies custom className to Accordion', () => {
    const { container } = render(
      <Accordion className='custom-class'>
        <AccordionItem value='item-1'>
          <AccordionTrigger>T</AccordionTrigger>
          <AccordionContent>C</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(
      container.querySelector('[data-slot="accordion"]')
    ).toHaveClass('custom-class')
  })

  test('applies custom className to AccordionItem', () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value='item-1' className='item-custom'>
          <AccordionTrigger>T</AccordionTrigger>
          <AccordionContent>C</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(
      container.querySelector('[data-slot="accordion-item"]')
    ).toHaveClass('item-custom')
  })

  test('renders multiple items', () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value='item-1'>
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>First content</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Second</AccordionTrigger>
          <AccordionContent>Second content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    const items = container.querySelectorAll('[data-slot="accordion-item"]')
    expect(items).toHaveLength(2)
  })

  test('AccordionTrigger renders children', () => {
    render(
      <Accordion>
        <AccordionItem value='item-1'>
          <AccordionTrigger>My trigger text</AccordionTrigger>
          <AccordionContent>C</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('My trigger text')).toBeInTheDocument()
  })
})

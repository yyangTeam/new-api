import { render, screen } from '@/test/test-utils'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'

describe('FieldSet', () => {
  test('renders fieldset with data-slot', () => {
    const { container } = render(<FieldSet>Content</FieldSet>)
    expect(
      container.querySelector('[data-slot="field-set"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <FieldSet className='custom'>Content</FieldSet>
    )
    expect(container.querySelector('[data-slot="field-set"]')).toHaveClass(
      'custom'
    )
  })
})

describe('FieldLegend', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldLegend>Legend</FieldLegend>)
    expect(
      container.querySelector('[data-slot="field-legend"]')
    ).toBeInTheDocument()
  })

  test('renders with default legend variant', () => {
    const { container } = render(<FieldLegend>Legend</FieldLegend>)
    expect(
      container.querySelector('[data-variant="legend"]')
    ).toBeInTheDocument()
  })

  test('renders with label variant', () => {
    const { container } = render(
      <FieldLegend variant='label'>Label</FieldLegend>
    )
    expect(
      container.querySelector('[data-variant="label"]')
    ).toBeInTheDocument()
  })
})

describe('FieldGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldGroup>Content</FieldGroup>)
    expect(
      container.querySelector('[data-slot="field-group"]')
    ).toBeInTheDocument()
  })
})

describe('Field', () => {
  test('renders with role=group', () => {
    render(<Field>Content</Field>)
    expect(screen.getByRole('group')).toBeInTheDocument()
  })

  test('renders with data-slot', () => {
    const { container } = render(<Field>Content</Field>)
    expect(container.querySelector('[data-slot="field"]')).toBeInTheDocument()
  })

  test('renders with default vertical orientation', () => {
    const { container } = render(<Field>Content</Field>)
    expect(
      container.querySelector('[data-orientation="vertical"]')
    ).toBeInTheDocument()
  })

  test('renders with horizontal orientation', () => {
    const { container } = render(
      <Field orientation='horizontal'>Content</Field>
    )
    expect(
      container.querySelector('[data-orientation="horizontal"]')
    ).toBeInTheDocument()
  })

  test('renders with responsive orientation', () => {
    const { container } = render(
      <Field orientation='responsive'>Content</Field>
    )
    expect(
      container.querySelector('[data-orientation="responsive"]')
    ).toBeInTheDocument()
  })
})

describe('FieldContent', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldContent>Content</FieldContent>)
    expect(
      container.querySelector('[data-slot="field-content"]')
    ).toBeInTheDocument()
  })
})

describe('FieldLabel', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldLabel>Label</FieldLabel>)
    expect(
      container.querySelector('[data-slot="field-label"]')
    ).toBeInTheDocument()
  })
})

describe('FieldTitle', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldTitle>Title</FieldTitle>)
    expect(
      container.querySelector('[data-slot="field-label"]')
    ).toBeInTheDocument()
  })

  test('renders text content', () => {
    render(<FieldTitle>My Title</FieldTitle>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

describe('FieldDescription', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldDescription>Desc</FieldDescription>)
    expect(
      container.querySelector('[data-slot="field-description"]')
    ).toBeInTheDocument()
  })

  test('renders description text', () => {
    render(<FieldDescription>Helper text</FieldDescription>)
    expect(screen.getByText('Helper text')).toBeInTheDocument()
  })
})

describe('FieldSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FieldSeparator />)
    expect(
      container.querySelector('[data-slot="field-separator"]')
    ).toBeInTheDocument()
  })

  test('renders without children and data-content=false', () => {
    const { container } = render(<FieldSeparator />)
    expect(
      container.querySelector('[data-content="false"]')
    ).toBeInTheDocument()
  })

  test('renders with children and data-content=true', () => {
    const { container } = render(<FieldSeparator>or</FieldSeparator>)
    expect(
      container.querySelector('[data-content="true"]')
    ).toBeInTheDocument()
    expect(screen.getByText('or')).toBeInTheDocument()
  })
})

describe('FieldError', () => {
  test('renders nothing when no children and no errors', () => {
    const { container } = render(<FieldError />)
    expect(
      container.querySelector('[data-slot="field-error"]')
    ).not.toBeInTheDocument()
  })

  test('renders with role=alert when children provided', () => {
    render(<FieldError>Something went wrong</FieldError>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  test('renders single error message', () => {
    render(<FieldError errors={[{ message: 'Required field' }]} />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  test('renders multiple error messages as list', () => {
    render(
      <FieldError
        errors={[{ message: 'Error 1' }, { message: 'Error 2' }]}
      />
    )
    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Error 2')).toBeInTheDocument()
  })

  test('renders nothing when errors array is empty', () => {
    const { container } = render(<FieldError errors={[]} />)
    expect(
      container.querySelector('[data-slot="field-error"]')
    ).not.toBeInTheDocument()
  })

  test('deduplicates errors with same message', () => {
    const { container } = render(
      <FieldError
        errors={[
          { message: 'Same error' },
          { message: 'Same error' },
        ]}
      />
    )
    // Should show single message, not a list
    expect(container.querySelector('ul')).not.toBeInTheDocument()
    expect(screen.getByText('Same error')).toBeInTheDocument()
  })

  test('children take priority over errors', () => {
    render(
      <FieldError errors={[{ message: 'From errors' }]}>
        Custom child
      </FieldError>
    )
    expect(screen.getByText('Custom child')).toBeInTheDocument()
    expect(screen.queryByText('From errors')).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <FieldError className='err-custom'>Error</FieldError>
    )
    expect(container.querySelector('[data-slot="field-error"]')).toHaveClass(
      'err-custom'
    )
  })
})

import { render, screen } from '@/test/test-utils'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

describe('Table', () => {
  test('renders table with data-slot', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(container.querySelector('[data-slot="table"]')).toBeInTheDocument()
  })

  test('wraps in a container div', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-container"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Table className='custom-table'>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(container.querySelector('[data-slot="table"]')).toHaveClass(
      'custom-table'
    )
  })
})

describe('TableHeader', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-header"]')
    ).toBeInTheDocument()
  })
})

describe('TableBody', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-body"]')
    ).toBeInTheDocument()
  })
})

describe('TableFooter', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-footer"]')
    ).toBeInTheDocument()
  })
})

describe('TableRow', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-row"]')
    ).toBeInTheDocument()
  })
})

describe('TableHead', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-head"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})

describe('TableCell', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-cell"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})

describe('TableCaption', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Table>
        <TableCaption>Caption text</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(
      container.querySelector('[data-slot="table-caption"]')
    ).toBeInTheDocument()
    expect(screen.getByText('Caption text')).toBeInTheDocument()
  })
})

import { render, screen, userEvent } from '@/test/test-utils'

import { TagInput } from './tag-input'

describe('TagInput', () => {
  const defaultProps = {
    value: [] as string[],
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders placeholder when no tags', () => {
    render(<TagInput {...defaultProps} placeholder='Type here...' />)
    expect(
      screen.getByPlaceholderText('Type here...')
    ).toBeInTheDocument()
  })

  test('renders default placeholder when no custom placeholder', () => {
    render(<TagInput {...defaultProps} />)
    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
  })

  test('hides placeholder when tags are present', () => {
    render(<TagInput {...defaultProps} value={['tag1']} />)
    expect(screen.queryByPlaceholderText('Add tags...')).not.toBeInTheDocument()
  })

  test('renders existing tags as badges', () => {
    render(<TagInput {...defaultProps} value={['alpha', 'beta']} />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  test('adds tag on Enter key press', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Add tags...')
    await user.type(input, 'newtag{Enter}')
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  test('adds tag on comma key press', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Add tags...')
    await user.type(input, 'newtag,')
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  test('does not add duplicate tag', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['existing']} onChange={onChange} />)
    const input = document.querySelector('input')!
    await user.type(input, 'existing{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('does not add empty tag', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Add tags...')
    await user.type(input, '   {Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('removes last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)
    const input = document.querySelector('input')!
    await user.click(input)
    await user.keyboard('{Backspace}')
    expect(onChange).toHaveBeenCalledWith(['tag1'])
  })

  test('removes specific tag when remove button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={['first', 'second']} onChange={onChange} />)
    const removeButtons = screen.getAllByRole('button', { name: 'Remove tag' })
    await user.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith(['second'])
  })

  test('does not render remove buttons when disabled', () => {
    render(<TagInput value={['tag1']} onChange={vi.fn()} disabled />)
    expect(
      screen.queryByRole('button', { name: 'Remove tag' })
    ).not.toBeInTheDocument()
  })

  test('disables input when disabled prop is true', () => {
    render(<TagInput value={[]} onChange={vi.fn()} disabled />)
    const input = document.querySelector('input')!
    expect(input).toBeDisabled()
  })

  test('adds tag on blur when input has value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Add tags...')
    await user.type(input, 'blurtag')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(['blurtag'])
  })

  test('applies custom className', () => {
    const { container } = render(
      <TagInput {...defaultProps} className='w-full' />
    )
    expect(container.querySelector('.w-full')).toBeInTheDocument()
  })

  test('focuses input on container click', async () => {
    const user = userEvent.setup()
    const { container } = render(<TagInput {...defaultProps} />)
    const wrapper = container.firstElementChild!
    await user.click(wrapper)
    const input = document.querySelector('input')!
    expect(document.activeElement).toBe(input)
  })
})

import { handleDropdownMenuItemSelect, type DropdownMenuItemSelectEvent } from './dropdown-menu-events'

describe('handleDropdownMenuItemSelect', () => {
  function createMockEvent(
    overrides: Partial<DropdownMenuItemSelectEvent> = {}
  ): DropdownMenuItemSelectEvent {
    let defaultPrevented = false
    return {
      defaultPrevented,
      preventDefault() {
        defaultPrevented = true
        Object.defineProperty(this, 'defaultPrevented', { value: true })
      },
      preventBaseUIHandler: vi.fn(),
      ...overrides,
    } as unknown as DropdownMenuItemSelectEvent
  }

  test('calls onClick when provided', () => {
    const onClick = vi.fn()
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, onClick)
    expect(onClick).toHaveBeenCalledWith(event)
  })

  test('calls onSelect when onClick does not prevent default', () => {
    const onClick = vi.fn()
    const onSelect = vi.fn()
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, onClick, onSelect)
    expect(onSelect).toHaveBeenCalledWith(event)
  })

  test('does not call onSelect when onClick prevents default', () => {
    const onClick = vi.fn((e: DropdownMenuItemSelectEvent) =>
      e.preventDefault()
    )
    const onSelect = vi.fn()
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, onClick, onSelect)
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('calls preventBaseUIHandler when default is prevented', () => {
    const onClick = vi.fn((e: DropdownMenuItemSelectEvent) =>
      e.preventDefault()
    )
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, onClick)
    expect(event.preventBaseUIHandler).toHaveBeenCalled()
  })

  test('does not call preventBaseUIHandler when default is not prevented', () => {
    const onClick = vi.fn()
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, onClick)
    expect(event.preventBaseUIHandler).not.toHaveBeenCalled()
  })

  test('works with only onSelect, no onClick', () => {
    const onSelect = vi.fn()
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, undefined, onSelect)
    expect(onSelect).toHaveBeenCalledWith(event)
  })

  test('works with neither onClick nor onSelect', () => {
    const event = createMockEvent()
    expect(() =>
      handleDropdownMenuItemSelect(event)
    ).not.toThrow()
  })

  test('onSelect can prevent default and trigger preventBaseUIHandler', () => {
    const onSelect = vi.fn((e: DropdownMenuItemSelectEvent) =>
      e.preventDefault()
    )
    const event = createMockEvent()
    handleDropdownMenuItemSelect(event, undefined, onSelect)
    expect(event.preventBaseUIHandler).toHaveBeenCalled()
  })
})

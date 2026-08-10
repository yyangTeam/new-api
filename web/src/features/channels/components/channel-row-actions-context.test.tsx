import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useContext } from 'react'

import {
  ChannelRowActionsLayoutContext,
  type ChannelRowActionsLayout,
} from './channel-row-actions-context'

describe('ChannelRowActionsLayoutContext', () => {
  it('has "table" as default value', () => {
    function Consumer() {
      const layout = useContext(ChannelRowActionsLayoutContext)
      return <span data-testid='layout'>{layout}</span>
    }
    render(<Consumer />)
    expect(screen.getByTestId('layout').textContent).toBe('table')
  })

  it('provides custom value', () => {
    function Consumer() {
      const layout = useContext(ChannelRowActionsLayoutContext)
      return <span data-testid='layout'>{layout}</span>
    }
    render(
      <ChannelRowActionsLayoutContext.Provider value='card'>
        <Consumer />
      </ChannelRowActionsLayoutContext.Provider>
    )
    expect(screen.getByTestId('layout').textContent).toBe('card')
  })

  it('type is a union of "table" | "card"', () => {
    const values: ChannelRowActionsLayout[] = ['table', 'card']
    expect(values).toEqual(['table', 'card'])
  })
})

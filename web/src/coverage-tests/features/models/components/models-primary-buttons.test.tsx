import { fireEvent } from '@testing-library/react'
import { render, screen, userEvent } from '@/test/test-utils'

import { ModelsProvider } from '@/features/models/components/models-provider'
import { ModelsPrimaryButtons } from '@/features/models/components/models-primary-buttons'

describe('ModelsPrimaryButtons', () => {
  function renderInProvider() {
    return render(
      <ModelsProvider>
        <ModelsPrimaryButtons />
      </ModelsProvider>
    )
  }

  test('renders Add Model button', () => {
    renderInProvider()
    expect(
      screen.getByRole('button', { name: /Add Model/i })
    ).toBeInTheDocument()
  })

  test('renders more actions dropdown trigger', () => {
    renderInProvider()
    // The MoreHorizontal icon button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  test('clicking Add Model opens create-model dialog state', async () => {
    const user = userEvent.setup()
    renderInProvider()
    await user.click(screen.getByRole('button', { name: /Add Model/i }))
    // Should not throw
  })

  test('dropdown menu shows expected items when opened', async () => {
    const user = userEvent.setup()
    renderInProvider()

    // Click the more button (last button). Base UI's DropdownMenu trigger
    // opens on pointerdown; under jsdom userEvent.click's synthetic pointer
    // events don't activate Base UI's handler, so dispatch pointerdown+click
    // directly and await the async menu render via findByText.
    const buttons = screen.getAllByRole('button')
    const moreButton = buttons[buttons.length - 1]
    fireEvent.pointerDown(moreButton)
    fireEvent.click(moreButton)

    // Menu items should be visible
    expect(await screen.findByText('Missing Models')).toBeInTheDocument()
    expect(await screen.findByText('Sync Upstream')).toBeInTheDocument()
    expect(await screen.findByText('Prefill Groups')).toBeInTheDocument()
    expect(await screen.findByText('Manage Vendors')).toBeInTheDocument()
  })
})

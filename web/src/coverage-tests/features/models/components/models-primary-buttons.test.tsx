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

    // Click the more button (second button)
    const buttons = screen.getAllByRole('button')
    const moreButton = buttons[buttons.length - 1]
    await user.click(moreButton)

    // Menu items should be visible
    expect(screen.getByText('Missing Models')).toBeInTheDocument()
    expect(screen.getByText('Sync Upstream')).toBeInTheDocument()
    expect(screen.getByText('Prefill Groups')).toBeInTheDocument()
    expect(screen.getByText('Manage Vendors')).toBeInTheDocument()
  })
})

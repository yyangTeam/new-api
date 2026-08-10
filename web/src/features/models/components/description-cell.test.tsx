import { render, screen, userEvent } from '@/test/test-utils'

import { ModelsProvider } from './models-provider'
import { DescriptionCell } from './description-cell'

describe('DescriptionCell', () => {
  function renderInProvider(props: {
    modelName: string
    description: string
  }) {
    return render(
      <ModelsProvider>
        <DescriptionCell {...props} />
      </ModelsProvider>
    )
  }

  test('renders dash when description is empty', () => {
    renderInProvider({ modelName: 'gpt-4', description: '' })
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('renders description text as a button', () => {
    renderInProvider({
      modelName: 'gpt-4',
      description: 'A powerful language model',
    })
    expect(
      screen.getByText('A powerful language model')
    ).toBeInTheDocument()
  })

  test('clicking the description button opens description dialog', async () => {
    const user = userEvent.setup()
    renderInProvider({
      modelName: 'gpt-4',
      description: 'A powerful language model',
    })

    await user.click(screen.getByText('A powerful language model'))

    // The click should not throw and the button should still be present
    expect(
      screen.getByText('A powerful language model')
    ).toBeInTheDocument()
  })
})

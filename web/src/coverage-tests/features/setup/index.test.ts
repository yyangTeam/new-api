import * as setupExports from '@/features/setup/index'

describe('setup index', () => {
  test('exports SetupWizard', () => {
    expect(setupExports).toHaveProperty('SetupWizard')
    expect(typeof setupExports.SetupWizard).toBe('function')
  })
})

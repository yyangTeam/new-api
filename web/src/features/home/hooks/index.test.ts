import { useHomePageContent } from './index'

describe('home/hooks barrel exports', () => {
  test('exports useHomePageContent', () => {
    expect(useHomePageContent).toBeDefined()
    expect(typeof useHomePageContent).toBe('function')
  })
})

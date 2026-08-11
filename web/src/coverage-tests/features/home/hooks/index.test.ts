import { useHomePageContent } from '@/features/home/hooks/index'

describe('home/hooks barrel exports', () => {
  test('exports useHomePageContent', () => {
    expect(useHomePageContent).toBeDefined()
    expect(typeof useHomePageContent).toBe('function')
  })
})

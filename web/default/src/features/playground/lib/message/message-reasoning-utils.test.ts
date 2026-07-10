import { parseThinkTags } from './message-reasoning-utils'

describe('parseThinkTags', () => {
  test('returns content as-is when no think tags present', () => {
    const result = parseThinkTags('Hello world')
    expect(result).toEqual({
      visibleContent: 'Hello world',
      reasoning: '',
      hasUnclosedTag: false,
    })
  })

  test('returns empty reasoning for empty content', () => {
    const result = parseThinkTags('')
    expect(result).toEqual({
      visibleContent: '',
      reasoning: '',
      hasUnclosedTag: false,
    })
  })

  test('extracts reasoning from complete think tag', () => {
    const result = parseThinkTags('<think>reasoning here</think>visible text')
    expect(result).toEqual({
      visibleContent: 'visible text',
      reasoning: 'reasoning here',
      hasUnclosedTag: false,
    })
  })

  test('handles think tag with empty content', () => {
    const result = parseThinkTags('<think></think>visible')
    expect(result).toEqual({
      visibleContent: 'visible',
      reasoning: '',
      hasUnclosedTag: false,
    })
  })

  test('handles content before and after think tag', () => {
    const result = parseThinkTags('before<think>thinking</think>after')
    expect(result).toEqual({
      visibleContent: 'beforeafter',
      reasoning: 'thinking',
      hasUnclosedTag: false,
    })
  })

  test('handles multiple think tags', () => {
    const result = parseThinkTags(
      '<think>first thought</think>visible1<think>second thought</think>visible2'
    )
    expect(result.visibleContent).toBe('visible1visible2')
    expect(result.reasoning).toBe('first thought\n\nsecond thought')
    expect(result.hasUnclosedTag).toBe(false)
  })

  test('detects unclosed think tag', () => {
    const result = parseThinkTags('<think>still thinking...')
    expect(result).toEqual({
      visibleContent: '',
      reasoning: 'still thinking...',
      hasUnclosedTag: true,
    })
  })

  test('handles unclosed tag after visible content', () => {
    const result = parseThinkTags('visible<think>partial reasoning')
    expect(result).toEqual({
      visibleContent: 'visible',
      reasoning: 'partial reasoning',
      hasUnclosedTag: true,
    })
  })

  test('handles only think tags with no visible content', () => {
    const result = parseThinkTags('<think>reasoning only</think>')
    expect(result).toEqual({
      visibleContent: '',
      reasoning: 'reasoning only',
      hasUnclosedTag: false,
    })
  })

  test('trims visible content', () => {
    const result = parseThinkTags('  <think>thinking</think>  hello  ')
    expect(result.visibleContent).toBe('hello')
  })

  test('trims reasoning content', () => {
    const result = parseThinkTags('<think>  reasoning  </think>')
    expect(result.reasoning).toBe('reasoning')
  })

  test('handles think tag at end of content', () => {
    const result = parseThinkTags('hello<think>reasoning</think>')
    expect(result.visibleContent).toBe('hello')
    expect(result.reasoning).toBe('reasoning')
    expect(result.hasUnclosedTag).toBe(false)
  })

  test('handles adjacent think tags', () => {
    const result = parseThinkTags('<think>a</think><think>b</think>')
    expect(result.reasoning).toBe('a\n\nb')
    expect(result.visibleContent).toBe('')
    expect(result.hasUnclosedTag).toBe(false)
  })

  test('does not treat nested think tags specially', () => {
    const result = parseThinkTags('<think>outer<think>inner</think>rest</think>')
    expect(result.hasUnclosedTag).toBe(false)
    expect(result.reasoning).toBe('outer<think>inner')
    expect(result.visibleContent).toBe('rest</think>')
  })
})

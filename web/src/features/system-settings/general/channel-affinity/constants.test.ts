import { RULE_TEMPLATES, makeUniqueName, cloneTemplate } from './constants'
import type { RuleTemplate } from './constants'

describe('RULE_TEMPLATES', () => {
  test('has codexCli template', () => {
    expect(RULE_TEMPLATES.codexCli).toBeDefined()
    expect(RULE_TEMPLATES.codexCli.name).toBe('codex cli trace')
  })

  test('has claudeCli template', () => {
    expect(RULE_TEMPLATES.claudeCli).toBeDefined()
    expect(RULE_TEMPLATES.claudeCli.name).toBe('claude cli trace')
  })

  test('codexCli template has correct model_regex', () => {
    expect(RULE_TEMPLATES.codexCli.model_regex).toEqual(['^gpt-.*$'])
  })

  test('claudeCli template has correct model_regex', () => {
    expect(RULE_TEMPLATES.claudeCli.model_regex).toEqual(['^claude-.*$'])
  })

  test('codexCli template has pass_headers operation', () => {
    const ops = RULE_TEMPLATES.codexCli.param_override_template as any
    expect(ops.operations).toBeDefined()
    expect(ops.operations[0].mode).toBe('pass_headers')
    expect(ops.operations[0].keep_origin).toBe(true)
  })

  test('claudeCli template has pass_headers operation', () => {
    const ops = RULE_TEMPLATES.claudeCli.param_override_template as any
    expect(ops.operations).toBeDefined()
    expect(ops.operations[0].mode).toBe('pass_headers')
  })

  test('codexCli path_regex targets /v1/responses', () => {
    expect(RULE_TEMPLATES.codexCli.path_regex).toEqual(['/v1/responses'])
  })

  test('claudeCli path_regex targets /v1/messages', () => {
    expect(RULE_TEMPLATES.claudeCli.path_regex).toEqual(['/v1/messages'])
  })
})

describe('makeUniqueName', () => {
  test('returns base name when not in existing set', () => {
    const existing = new Set<string>()
    expect(makeUniqueName(existing, 'rule')).toBe('rule')
  })

  test('appends -2 when base name already exists', () => {
    const existing = new Set(['rule'])
    expect(makeUniqueName(existing, 'rule')).toBe('rule-2')
  })

  test('appends -3 when -2 also exists', () => {
    const existing = new Set(['rule', 'rule-2'])
    expect(makeUniqueName(existing, 'rule')).toBe('rule-3')
  })

  test('trims whitespace from base name', () => {
    const existing = new Set<string>()
    expect(makeUniqueName(existing, '  my rule  ')).toBe('my rule')
  })

  test('uses default name "rule" when baseName is empty', () => {
    const existing = new Set<string>()
    expect(makeUniqueName(existing, '')).toBe('rule')
  })

  test('uses default name "rule" when baseName is only whitespace', () => {
    const existing = new Set<string>()
    expect(makeUniqueName(existing, '   ')).toBe('rule')
  })

  test('handles many collisions', () => {
    const existing = new Set<string>()
    for (let i = 0; i < 50; i++) {
      existing.add(i === 0 ? 'rule' : `rule-${i + 1}`)
    }
    expect(makeUniqueName(existing, 'rule')).toBe('rule-51')
  })
})

describe('cloneTemplate', () => {
  test('returns a deep copy of an object', () => {
    const original = { a: 1, b: { c: 2 } }
    const cloned = cloneTemplate(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.b).not.toBe(original.b)
  })

  test('modifying clone does not affect original', () => {
    const original: RuleTemplate = { ...RULE_TEMPLATES.codexCli }
    const cloned = cloneTemplate(original)
    cloned.name = 'modified'
    expect(original.name).toBe('codex cli trace')
  })

  test('clones arrays correctly', () => {
    const original = { arr: [1, 2, 3] }
    const cloned = cloneTemplate(original)
    cloned.arr.push(4)
    expect(original.arr).toEqual([1, 2, 3])
  })
})

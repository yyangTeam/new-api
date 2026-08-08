import {
  getAvailableGroups,
  replaceModelInPath,
  isTokenBasedModel,
} from './model-helpers'
import type { PricingModel } from '../types'

function makeModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 2,
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    ...overrides,
  }
}

describe('getAvailableGroups', () => {
  test('returns groups that are in both usableGroup and enable_groups', () => {
    const model = makeModel({ enable_groups: ['a', 'b', 'c'] })
    const usableGroup = {
      a: { desc: '', ratio: 1 },
      b: { desc: '', ratio: 1 },
      d: { desc: '', ratio: 1 },
    }
    expect(getAvailableGroups(model, usableGroup)).toEqual(['a', 'b'])
  })

  test('excludes empty string and auto groups', () => {
    const model = makeModel({ enable_groups: ['', 'auto', 'default'] })
    const usableGroup = {
      '': { desc: '', ratio: 1 },
      auto: { desc: '', ratio: 1 },
      default: { desc: '', ratio: 1 },
    }
    expect(getAvailableGroups(model, usableGroup)).toEqual(['default'])
  })

  test('returns empty array when no overlap', () => {
    const model = makeModel({ enable_groups: ['x', 'y'] })
    const usableGroup = {
      a: { desc: '', ratio: 1 },
    }
    expect(getAvailableGroups(model, usableGroup)).toEqual([])
  })

  test('returns empty array when enable_groups is empty', () => {
    const model = makeModel({ enable_groups: [] })
    const usableGroup = {
      a: { desc: '', ratio: 1 },
    }
    expect(getAvailableGroups(model, usableGroup)).toEqual([])
  })

  test('returns empty array when usableGroup is empty', () => {
    const model = makeModel({ enable_groups: ['a'] })
    expect(getAvailableGroups(model, {})).toEqual([])
  })

  test('handles enable_groups not being an array', () => {
    const model = makeModel({
      enable_groups: 'not-an-array' as unknown as string[],
    })
    const usableGroup = {
      a: { desc: '', ratio: 1 },
    }
    expect(getAvailableGroups(model, usableGroup)).toEqual([])
  })
})

describe('replaceModelInPath', () => {
  test('replaces {model} placeholder with model name', () => {
    expect(replaceModelInPath('/v1/models/{model}/info', 'gpt-4')).toBe(
      '/v1/models/gpt-4/info'
    )
  })

  test('replaces multiple occurrences', () => {
    expect(
      replaceModelInPath('/v1/{model}/chat/{model}', 'claude-3')
    ).toBe('/v1/claude-3/chat/claude-3')
  })

  test('returns path unchanged when no placeholder', () => {
    expect(replaceModelInPath('/v1/models/list', 'gpt-4')).toBe(
      '/v1/models/list'
    )
  })

  test('handles empty path', () => {
    expect(replaceModelInPath('', 'gpt-4')).toBe('')
  })

  test('handles empty model name', () => {
    expect(replaceModelInPath('/v1/{model}', '')).toBe('/v1/')
  })
})

describe('isTokenBasedModel', () => {
  test('returns true when quota_type is TOKEN (0)', () => {
    const model = makeModel({ quota_type: 0 })
    expect(isTokenBasedModel(model)).toBe(true)
  })

  test('returns false when quota_type is REQUEST (1)', () => {
    const model = makeModel({ quota_type: 1 })
    expect(isTokenBasedModel(model)).toBe(false)
  })
})

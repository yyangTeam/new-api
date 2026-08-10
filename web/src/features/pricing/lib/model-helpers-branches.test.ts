import {
  getAvailableGroups,
  getConfiguredGroupRatio,
  getDisplayGroupRatio,
  replaceModelInPath,
  isTokenBasedModel,
} from './model-helpers'
import type { PricingModel } from '../types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default', 'premium'],
    ...overrides,
  }
}

describe('model-helpers - branch coverage', () => {
  describe('getAvailableGroups', () => {
    test('returns groups present in both model and usable groups', () => {
      const model = createModel({ enable_groups: ['default', 'premium'] })
      const usable = {
        default: { desc: '', ratio: 1 },
        premium: { desc: '', ratio: 2 },
        vip: { desc: '', ratio: 3 },
      }
      expect(getAvailableGroups(model, usable)).toEqual([
        'default',
        'premium',
      ])
    })

    test('excludes empty string and auto groups', () => {
      const model = createModel({
        enable_groups: ['default', '', 'auto', 'premium'],
      })
      const usable = {
        '': { desc: '', ratio: 1 },
        auto: { desc: '', ratio: 1 },
        default: { desc: '', ratio: 1 },
        premium: { desc: '', ratio: 1 },
      }
      expect(getAvailableGroups(model, usable)).toEqual([
        'default',
        'premium',
      ])
    })

    test('handles non-array enable_groups', () => {
      const model = createModel({
        enable_groups: undefined as unknown as string[],
      })
      const usable = { default: { desc: '', ratio: 1 } }
      expect(getAvailableGroups(model, usable)).toEqual([])
    })

    test('returns empty array when no overlap', () => {
      const model = createModel({ enable_groups: ['groupA'] })
      const usable = { groupB: { desc: '', ratio: 1 } }
      expect(getAvailableGroups(model, usable)).toEqual([])
    })
  })

  describe('getConfiguredGroupRatio', () => {
    test('returns configured ratio', () => {
      expect(getConfiguredGroupRatio({ default: 0.5 }, 'default')).toBe(0.5)
    })

    test('returns 1 for missing group', () => {
      expect(getConfiguredGroupRatio({}, 'missing')).toBe(1)
    })

    test('returns 1 for NaN ratio', () => {
      expect(
        getConfiguredGroupRatio(
          { default: NaN } as Record<string, number>,
          'default'
        )
      ).toBe(1)
    })

    test('returns 1 for Infinity ratio', () => {
      expect(
        getConfiguredGroupRatio(
          { default: Infinity } as Record<string, number>,
          'default'
        )
      ).toBe(1)
    })

    test('returns 0 for valid zero ratio', () => {
      expect(getConfiguredGroupRatio({ default: 0 }, 'default')).toBe(0)
    })
  })

  describe('getDisplayGroupRatio', () => {
    test('returns selected group ratio when group is specified', () => {
      const model = createModel({
        enable_groups: ['default', 'premium'],
        group_ratio: { default: 1, premium: 0.5 },
      })
      expect(getDisplayGroupRatio(model, 'premium')).toBe(0.5)
    })

    test('returns 1 when selected group is "all"', () => {
      const model = createModel({
        enable_groups: ['default'],
        group_ratio: { default: 0.5 },
      })
      expect(getDisplayGroupRatio(model, 'all')).toBe(0.5)
    })

    test('returns minimum group ratio when no group selected', () => {
      const model = createModel({
        enable_groups: ['default', 'premium', 'vip'],
        group_ratio: { default: 1, premium: 0.5, vip: 0.3 },
      })
      expect(getDisplayGroupRatio(model)).toBe(0.3)
    })

    test('returns 1 when enable_groups is empty', () => {
      const model = createModel({ enable_groups: [] })
      expect(getDisplayGroupRatio(model)).toBe(1)
    })

    test('returns 1 when no group_ratio set and groups exist', () => {
      const model = createModel({
        enable_groups: ['default'],
        group_ratio: {},
      })
      expect(getDisplayGroupRatio(model)).toBe(1)
    })

    test('ignores selected group not in enable_groups', () => {
      const model = createModel({
        enable_groups: ['default'],
        group_ratio: { default: 0.5, nonexist: 0.1 },
      })
      expect(getDisplayGroupRatio(model, 'nonexist')).toBe(0.5)
    })

    test('handles undefined group_ratio', () => {
      const model = createModel({
        enable_groups: ['default'],
        group_ratio: undefined,
      })
      expect(getDisplayGroupRatio(model)).toBe(1)
    })
  })

  describe('replaceModelInPath', () => {
    test('replaces single {model} placeholder', () => {
      expect(
        replaceModelInPath('/v1/chat/{model}', 'gpt-4o')
      ).toBe('/v1/chat/gpt-4o')
    })

    test('replaces multiple {model} placeholders', () => {
      expect(
        replaceModelInPath('/v1/{model}/chat/{model}', 'gpt-4')
      ).toBe('/v1/gpt-4/chat/gpt-4')
    })

    test('returns path unchanged when no placeholder', () => {
      expect(replaceModelInPath('/v1/chat', 'gpt-4')).toBe('/v1/chat')
    })
  })

  describe('isTokenBasedModel', () => {
    test('returns true for quota_type 0', () => {
      expect(isTokenBasedModel(createModel({ quota_type: 0 }))).toBe(true)
    })

    test('returns false for quota_type 1', () => {
      expect(isTokenBasedModel(createModel({ quota_type: 1 }))).toBe(false)
    })
  })
})

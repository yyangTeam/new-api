import { isAdvancedSettingsField, hasAdvancedSettingsErrors } from './channel-form-errors'

describe('isAdvancedSettingsField', () => {
  test('returns true for known advanced settings fields', () => {
    expect(isAdvancedSettingsField('priority')).toBe(true)
    expect(isAdvancedSettingsField('weight')).toBe(true)
    expect(isAdvancedSettingsField('test_model')).toBe(true)
    expect(isAdvancedSettingsField('auto_ban')).toBe(true)
    expect(isAdvancedSettingsField('tag')).toBe(true)
    expect(isAdvancedSettingsField('remark')).toBe(true)
    expect(isAdvancedSettingsField('param_override')).toBe(true)
    expect(isAdvancedSettingsField('header_override')).toBe(true)
    expect(isAdvancedSettingsField('status_code_mapping')).toBe(true)
    expect(isAdvancedSettingsField('advanced_custom')).toBe(true)
    expect(isAdvancedSettingsField('force_format')).toBe(true)
    expect(isAdvancedSettingsField('thinking_to_content')).toBe(true)
    expect(isAdvancedSettingsField('pass_through_body_enabled')).toBe(true)
    expect(isAdvancedSettingsField('proxy')).toBe(true)
    expect(isAdvancedSettingsField('system_prompt')).toBe(true)
    expect(isAdvancedSettingsField('system_prompt_override')).toBe(true)
    expect(isAdvancedSettingsField('allow_service_tier')).toBe(true)
    expect(isAdvancedSettingsField('disable_store')).toBe(true)
    expect(isAdvancedSettingsField('allow_safety_identifier')).toBe(true)
    expect(isAdvancedSettingsField('allow_include_obfuscation')).toBe(true)
    expect(isAdvancedSettingsField('allow_inference_geo')).toBe(true)
    expect(isAdvancedSettingsField('allow_speed')).toBe(true)
    expect(isAdvancedSettingsField('claude_beta_query')).toBe(true)
    expect(isAdvancedSettingsField('disable_task_polling_sleep')).toBe(true)
    expect(isAdvancedSettingsField('upstream_model_update_check_enabled')).toBe(true)
    expect(isAdvancedSettingsField('upstream_model_update_auto_sync_enabled')).toBe(true)
    expect(isAdvancedSettingsField('upstream_model_update_ignored_models')).toBe(true)
  })

  test('returns false for non-advanced fields', () => {
    expect(isAdvancedSettingsField('name')).toBe(false)
    expect(isAdvancedSettingsField('type')).toBe(false)
    expect(isAdvancedSettingsField('key')).toBe(false)
    expect(isAdvancedSettingsField('models')).toBe(false)
    expect(isAdvancedSettingsField('group')).toBe(false)
    expect(isAdvancedSettingsField('base_url')).toBe(false)
    expect(isAdvancedSettingsField('status')).toBe(false)
  })

  test('returns false for unknown fields', () => {
    expect(isAdvancedSettingsField('nonexistent_field')).toBe(false)
    expect(isAdvancedSettingsField('')).toBe(false)
  })
})

describe('hasAdvancedSettingsErrors', () => {
  test('returns true when errors contain advanced settings fields', () => {
    expect(hasAdvancedSettingsErrors({ priority: 'error' })).toBe(true)
    expect(hasAdvancedSettingsErrors({ tag: 'error', remark: 'error' })).toBe(true)
    expect(hasAdvancedSettingsErrors({ force_format: 'error' })).toBe(true)
  })

  test('returns false when errors only contain non-advanced fields', () => {
    expect(hasAdvancedSettingsErrors({ name: 'error' })).toBe(false)
    expect(hasAdvancedSettingsErrors({ type: 'error', key: 'error' })).toBe(false)
    expect(hasAdvancedSettingsErrors({ models: 'error' })).toBe(false)
  })

  test('returns true when errors contain mix of advanced and non-advanced fields', () => {
    expect(hasAdvancedSettingsErrors({ name: 'error', priority: 'error' })).toBe(true)
  })

  test('returns false for empty errors object', () => {
    expect(hasAdvancedSettingsErrors({})).toBe(false)
  })
})

import {
  resolveThemeFont,
  THEME_PRESETS,
  THEME_PRESET_VALUES,
  THEME_FONT_VALUES,
  THEME_RADIUS_VALUES,
  THEME_SCALE_VALUES,
  CONTENT_LAYOUT_VALUES,
  THEME_COOKIE_KEYS,
  PRESET_DEFAULT_FONT,
  DEFAULT_THEME_CUSTOMIZATION,
} from './theme-customization'

describe('resolveThemeFont', () => {
  test('returns sans for default font with default preset', () => {
    expect(resolveThemeFont('default', 'default')).toBe('sans')
  })

  test('returns serif for default font with anthropic preset', () => {
    expect(resolveThemeFont('default', 'anthropic')).toBe('serif')
  })

  test('returns sans for default font with unlisted preset', () => {
    expect(resolveThemeFont('default', 'underground')).toBe('sans')
    expect(resolveThemeFont('default', 'rose-garden')).toBe('sans')
    expect(resolveThemeFont('default', 'lake-view')).toBe('sans')
    expect(resolveThemeFont('default', 'sunset-glow')).toBe('sans')
    expect(resolveThemeFont('default', 'forest-whisper')).toBe('sans')
    expect(resolveThemeFont('default', 'ocean-breeze')).toBe('sans')
    expect(resolveThemeFont('default', 'lavender-dream')).toBe('sans')
    expect(resolveThemeFont('default', 'simple-large')).toBe('sans')
  })

  test('returns sans when explicitly set to sans regardless of preset', () => {
    expect(resolveThemeFont('sans', 'default')).toBe('sans')
    expect(resolveThemeFont('sans', 'anthropic')).toBe('sans')
    expect(resolveThemeFont('sans', 'underground')).toBe('sans')
  })

  test('returns serif when explicitly set to serif regardless of preset', () => {
    expect(resolveThemeFont('serif', 'default')).toBe('serif')
    expect(resolveThemeFont('serif', 'anthropic')).toBe('serif')
    expect(resolveThemeFont('serif', 'underground')).toBe('serif')
  })
})

describe('THEME_PRESETS', () => {
  test('contains expected number of presets', () => {
    expect(THEME_PRESETS.length).toBe(10)
  })

  test('each preset has value, name, and exactly 2 swatches', () => {
    for (const preset of THEME_PRESETS) {
      expect(typeof preset.value).toBe('string')
      expect(typeof preset.name).toBe('string')
      expect(preset.swatches).toHaveLength(2)
    }
  })

  test('first preset is default', () => {
    expect(THEME_PRESETS[0].value).toBe('default')
    expect(THEME_PRESETS[0].name).toBe('Default')
  })

  test('all preset values are unique', () => {
    const values = THEME_PRESETS.map((p) => p.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('THEME_PRESET_VALUES', () => {
  test('is a Set containing all preset values', () => {
    for (const preset of THEME_PRESETS) {
      expect(THEME_PRESET_VALUES.has(preset.value)).toBe(true)
    }
  })

  test('has the same size as THEME_PRESETS', () => {
    expect(THEME_PRESET_VALUES.size).toBe(THEME_PRESETS.length)
  })
})

describe('THEME_FONT_VALUES', () => {
  test('contains default, sans, and serif', () => {
    expect(THEME_FONT_VALUES.has('default')).toBe(true)
    expect(THEME_FONT_VALUES.has('sans')).toBe(true)
    expect(THEME_FONT_VALUES.has('serif')).toBe(true)
    expect(THEME_FONT_VALUES.size).toBe(3)
  })
})

describe('THEME_RADIUS_VALUES', () => {
  test('contains all expected radius values', () => {
    expect(THEME_RADIUS_VALUES.has('default')).toBe(true)
    expect(THEME_RADIUS_VALUES.has('none')).toBe(true)
    expect(THEME_RADIUS_VALUES.has('sm')).toBe(true)
    expect(THEME_RADIUS_VALUES.has('md')).toBe(true)
    expect(THEME_RADIUS_VALUES.has('lg')).toBe(true)
    expect(THEME_RADIUS_VALUES.has('xl')).toBe(true)
    expect(THEME_RADIUS_VALUES.size).toBe(6)
  })
})

describe('THEME_SCALE_VALUES', () => {
  test('contains all expected scale values', () => {
    expect(THEME_SCALE_VALUES.has('default')).toBe(true)
    expect(THEME_SCALE_VALUES.has('sm')).toBe(true)
    expect(THEME_SCALE_VALUES.has('lg')).toBe(true)
    expect(THEME_SCALE_VALUES.has('xl')).toBe(true)
    expect(THEME_SCALE_VALUES.size).toBe(4)
  })
})

describe('CONTENT_LAYOUT_VALUES', () => {
  test('contains full and centered', () => {
    expect(CONTENT_LAYOUT_VALUES.has('full')).toBe(true)
    expect(CONTENT_LAYOUT_VALUES.has('centered')).toBe(true)
    expect(CONTENT_LAYOUT_VALUES.size).toBe(2)
  })
})

describe('THEME_COOKIE_KEYS', () => {
  test('maps each customization axis to a cookie key', () => {
    expect(THEME_COOKIE_KEYS.preset).toBe('theme_preset')
    expect(THEME_COOKIE_KEYS.font).toBe('theme_font')
    expect(THEME_COOKIE_KEYS.radius).toBe('theme_radius')
    expect(THEME_COOKIE_KEYS.scale).toBe('theme_scale')
    expect(THEME_COOKIE_KEYS.contentLayout).toBe('theme_content_layout')
  })
})

describe('PRESET_DEFAULT_FONT', () => {
  test('maps default preset to sans', () => {
    expect(PRESET_DEFAULT_FONT['default']).toBe('sans')
  })

  test('maps anthropic preset to serif', () => {
    expect(PRESET_DEFAULT_FONT['anthropic']).toBe('serif')
  })

  test('does not define font for other presets', () => {
    expect(PRESET_DEFAULT_FONT['underground']).toBeUndefined()
    expect(PRESET_DEFAULT_FONT['rose-garden']).toBeUndefined()
  })
})

describe('DEFAULT_THEME_CUSTOMIZATION', () => {
  test('has expected default values', () => {
    expect(DEFAULT_THEME_CUSTOMIZATION).toEqual({
      preset: 'default',
      font: 'default',
      radius: 'default',
      scale: 'default',
      contentLayout: 'full',
    })
  })
})

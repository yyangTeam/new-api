import {
  getAvatarColorClass,
  getBgColorClass,
  getChartColor,
  getAnnouncementColorClass,
  stringToColor,
  avatarColorMap,
  colorToBgClass,
  CHART_COLORS,
  ANNOUNCEMENT_TYPE_COLORS,
} from './colors'

describe('stringToColor', () => {
  test('returns a SemanticColor from TAG_COLORS', () => {
    const validColors = [
      'amber', 'blue', 'cyan', 'green', 'grey', 'indigo', 'light-blue',
      'lime', 'orange', 'pink', 'purple', 'red', 'teal', 'violet', 'yellow',
    ]
    expect(validColors).toContain(stringToColor('hello'))
    expect(validColors).toContain(stringToColor('world'))
  })

  test('is deterministic for the same input', () => {
    expect(stringToColor('test')).toBe(stringToColor('test'))
    expect(stringToColor('gpt-4')).toBe(stringToColor('gpt-4'))
  })

  test('produces different colors for different inputs', () => {
    const colors = new Set([
      stringToColor('a'),
      stringToColor('b'),
      stringToColor('abc'),
      stringToColor('xyz'),
      stringToColor('hello'),
    ])
    expect(colors.size).toBeGreaterThan(1)
  })

  test('handles empty string', () => {
    const result = stringToColor('')
    expect(typeof result).toBe('string')
  })
})

describe('getAvatarColorClass', () => {
  test('returns a class string from avatarColorMap', () => {
    const result = getAvatarColorClass('admin')
    const color = stringToColor('admin')
    expect(result).toBe(avatarColorMap[color])
  })

  test('returns a non-empty string', () => {
    expect(getAvatarColorClass('user').length).toBeGreaterThan(0)
  })

  test('is deterministic', () => {
    expect(getAvatarColorClass('alice')).toBe(getAvatarColorClass('alice'))
  })
})

describe('getBgColorClass', () => {
  test('returns blue default when no color provided', () => {
    expect(getBgColorClass()).toBe('bg-blue-500')
    expect(getBgColorClass(undefined)).toBe('bg-blue-500')
  })

  test('returns blue default for empty string', () => {
    expect(getBgColorClass('')).toBe('bg-blue-500')
  })

  test('returns correct class for known semantic colors', () => {
    expect(getBgColorClass('red')).toBe('bg-red-500')
    expect(getBgColorClass('green')).toBe('bg-green-500')
    expect(getBgColorClass('purple')).toBe('bg-purple-500')
    expect(getBgColorClass('cyan')).toBe('bg-cyan-500')
  })

  test('returns blue default for unknown color', () => {
    expect(getBgColorClass('chartreuse')).toBe('bg-blue-500')
  })

  test('handles compound semantic colors', () => {
    expect(getBgColorClass('light-green')).toBe('bg-green-400')
    expect(getBgColorClass('light-blue')).toBe('bg-sky-400')
  })
})

describe('getChartColor', () => {
  test('returns colors cycling through the palette', () => {
    expect(getChartColor(0)).toBe(CHART_COLORS[0])
    expect(getChartColor(1)).toBe(CHART_COLORS[1])
    expect(getChartColor(11)).toBe(CHART_COLORS[11])
  })

  test('wraps around when index exceeds palette length', () => {
    expect(getChartColor(12)).toBe(CHART_COLORS[0])
    expect(getChartColor(13)).toBe(CHART_COLORS[1])
    expect(getChartColor(24)).toBe(CHART_COLORS[0])
  })

  test('returns valid HSL strings', () => {
    for (let i = 0; i < CHART_COLORS.length; i++) {
      expect(getChartColor(i)).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
    }
  })
})

describe('getAnnouncementColorClass', () => {
  test('returns correct class for each announcement type', () => {
    expect(getAnnouncementColorClass('default')).toBe('bg-neutral')
    expect(getAnnouncementColorClass('ongoing')).toBe('bg-info')
    expect(getAnnouncementColorClass('success')).toBe('bg-success')
    expect(getAnnouncementColorClass('warning')).toBe('bg-warning')
    expect(getAnnouncementColorClass('error')).toBe('bg-destructive')
  })

  test('returns default for undefined', () => {
    expect(getAnnouncementColorClass(undefined)).toBe('bg-neutral')
  })

  test('returns default for unknown type', () => {
    expect(getAnnouncementColorClass('critical')).toBe('bg-neutral')
  })

  test('returns default for empty string', () => {
    expect(getAnnouncementColorClass('')).toBe('bg-neutral')
  })
})

import {
  mjTaskTypeMapper,
  mjStatusMapper,
  mjSubmitResultMapper,
  taskActionMapper,
  taskStatusMapper,
  taskPlatformMapper,
} from './mappers'

describe('mjTaskTypeMapper', () => {
  test('getLabel returns correct label for known task types', () => {
    expect(mjTaskTypeMapper.getLabel('IMAGINE')).toBe('Draw')
    expect(mjTaskTypeMapper.getLabel('UPSCALE')).toBe('Upscale')
    expect(mjTaskTypeMapper.getLabel('VIDEO')).toBe('Video')
    expect(mjTaskTypeMapper.getLabel('EDITS')).toBe('Edit')
    expect(mjTaskTypeMapper.getLabel('VARIATION')).toBe('Vary')
    expect(mjTaskTypeMapper.getLabel('HIGH_VARIATION')).toBe('Vary (Strong)')
    expect(mjTaskTypeMapper.getLabel('LOW_VARIATION')).toBe('Vary (Subtle)')
    expect(mjTaskTypeMapper.getLabel('PAN')).toBe('Pan')
    expect(mjTaskTypeMapper.getLabel('DESCRIBE')).toBe('Describe')
    expect(mjTaskTypeMapper.getLabel('BLEND')).toBe('Blend')
    expect(mjTaskTypeMapper.getLabel('UPLOAD')).toBe('Upload')
    expect(mjTaskTypeMapper.getLabel('SHORTEN')).toBe('Shorten')
    expect(mjTaskTypeMapper.getLabel('REROLL')).toBe('Reroll')
    expect(mjTaskTypeMapper.getLabel('INPAINT')).toBe('Inpaint')
    expect(mjTaskTypeMapper.getLabel('SWAP_FACE')).toBe('Swap Face')
    expect(mjTaskTypeMapper.getLabel('ZOOM')).toBe('Zoom')
    expect(mjTaskTypeMapper.getLabel('CUSTOM_ZOOM')).toBe('Custom Zoom')
  })

  test('getLabel returns default for unknown task type', () => {
    expect(mjTaskTypeMapper.getLabel('NONEXISTENT')).toBe('Unknown')
  })

  test('getLabel returns custom default for unknown task type', () => {
    expect(mjTaskTypeMapper.getLabel('NONEXISTENT', 'N/A')).toBe('N/A')
  })

  test('getVariant returns correct variant for known task types', () => {
    expect(mjTaskTypeMapper.getVariant('IMAGINE')).toBe('blue')
    expect(mjTaskTypeMapper.getVariant('UPSCALE')).toBe('orange')
    expect(mjTaskTypeMapper.getVariant('VARIATION')).toBe('violet')
    expect(mjTaskTypeMapper.getVariant('PAN')).toBe('cyan')
    expect(mjTaskTypeMapper.getVariant('DESCRIBE')).toBe('yellow')
    expect(mjTaskTypeMapper.getVariant('BLEND')).toBe('lime')
    expect(mjTaskTypeMapper.getVariant('SHORTEN')).toBe('pink')
    expect(mjTaskTypeMapper.getVariant('REROLL')).toBe('indigo')
    expect(mjTaskTypeMapper.getVariant('INPAINT')).toBe('teal')
    expect(mjTaskTypeMapper.getVariant('SWAP_FACE')).toBe('purple')
    expect(mjTaskTypeMapper.getVariant('ZOOM')).toBe('green')
  })

  test('getVariant returns default for unknown task type', () => {
    expect(mjTaskTypeMapper.getVariant('NONEXISTENT')).toBe('neutral')
  })

  test('getVariant returns custom default for unknown task type', () => {
    expect(mjTaskTypeMapper.getVariant('NONEXISTENT', 'red')).toBe('red')
  })
})

describe('mjStatusMapper', () => {
  test('getLabel returns correct labels for all statuses', () => {
    expect(mjStatusMapper.getLabel('SUCCESS')).toBe('Success')
    expect(mjStatusMapper.getLabel('NOT_START')).toBe('Not Started')
    expect(mjStatusMapper.getLabel('SUBMITTED')).toBe('Queued')
    expect(mjStatusMapper.getLabel('IN_PROGRESS')).toBe('In Progress')
    expect(mjStatusMapper.getLabel('FAILURE')).toBe('Failed')
    expect(mjStatusMapper.getLabel('MODAL')).toBe('Waiting')
  })

  test('getVariant returns correct variants for all statuses', () => {
    expect(mjStatusMapper.getVariant('SUCCESS')).toBe('green')
    expect(mjStatusMapper.getVariant('NOT_START')).toBe('neutral')
    expect(mjStatusMapper.getVariant('SUBMITTED')).toBe('yellow')
    expect(mjStatusMapper.getVariant('IN_PROGRESS')).toBe('blue')
    expect(mjStatusMapper.getVariant('FAILURE')).toBe('red')
    expect(mjStatusMapper.getVariant('MODAL')).toBe('amber')
  })

  test('getLabel returns default for unknown status', () => {
    expect(mjStatusMapper.getLabel('UNKNOWN_STATUS')).toBe('Unknown')
  })

  test('getVariant returns default for unknown status', () => {
    expect(mjStatusMapper.getVariant('UNKNOWN_STATUS')).toBe('neutral')
  })
})

describe('mjSubmitResultMapper', () => {
  test('getLabel returns correct labels for submit result codes', () => {
    expect(mjSubmitResultMapper.getLabel('1')).toBe('Submitted')
    expect(mjSubmitResultMapper.getLabel('21')).toBe('Waiting')
    expect(mjSubmitResultMapper.getLabel('22')).toBe('Duplicate')
    expect(mjSubmitResultMapper.getLabel('0')).toBe('Not Submitted')
  })

  test('getVariant returns correct variants for submit result codes', () => {
    expect(mjSubmitResultMapper.getVariant('1')).toBe('green')
    expect(mjSubmitResultMapper.getVariant('21')).toBe('lime')
    expect(mjSubmitResultMapper.getVariant('22')).toBe('orange')
    expect(mjSubmitResultMapper.getVariant('0')).toBe('yellow')
  })

  test('getLabel returns default for unknown code', () => {
    expect(mjSubmitResultMapper.getLabel('999')).toBe('Unknown')
  })

  test('getVariant returns default for unknown code', () => {
    expect(mjSubmitResultMapper.getVariant('999')).toBe('neutral')
  })
})

describe('taskActionMapper', () => {
  test('getLabel returns correct labels for task actions', () => {
    expect(taskActionMapper.getLabel('MUSIC')).toBe('Generate Music')
    expect(taskActionMapper.getLabel('LYRICS')).toBe('Generate Lyrics')
    expect(taskActionMapper.getLabel('generate')).toBe('Image to Video')
    expect(taskActionMapper.getLabel('textGenerate')).toBe('Text to Video')
    expect(taskActionMapper.getLabel('firstTailGenerate')).toBe(
      'First/Last Frame to Video'
    )
    expect(taskActionMapper.getLabel('referenceGenerate')).toBe(
      'Reference Video'
    )
    expect(taskActionMapper.getLabel('remixGenerate')).toBe('Video Remix')
  })

  test('getVariant returns correct variants for task actions', () => {
    expect(taskActionMapper.getVariant('MUSIC')).toBe('neutral')
    expect(taskActionMapper.getVariant('LYRICS')).toBe('pink')
    expect(taskActionMapper.getVariant('generate')).toBe('blue')
    expect(taskActionMapper.getVariant('textGenerate')).toBe('blue')
  })

  test('getLabel returns default for unknown action', () => {
    expect(taskActionMapper.getLabel('UNKNOWN_ACTION')).toBe('Unknown')
  })

  test('getVariant returns default for unknown action', () => {
    expect(taskActionMapper.getVariant('UNKNOWN_ACTION')).toBe('neutral')
  })
})

describe('taskStatusMapper', () => {
  test('getLabel returns correct labels for task statuses', () => {
    expect(taskStatusMapper.getLabel('SUCCESS')).toBe('Success')
    expect(taskStatusMapper.getLabel('NOT_START')).toBe('Not Started')
    expect(taskStatusMapper.getLabel('SUBMITTED')).toBe('Queued')
    expect(taskStatusMapper.getLabel('IN_PROGRESS')).toBe('In Progress')
    expect(taskStatusMapper.getLabel('FAILURE')).toBe('Failed')
    expect(taskStatusMapper.getLabel('QUEUED')).toBe('Queued')
    expect(taskStatusMapper.getLabel('UNKNOWN')).toBe('Unknown')
  })

  test('getVariant returns correct variants for task statuses', () => {
    expect(taskStatusMapper.getVariant('SUCCESS')).toBe('green')
    expect(taskStatusMapper.getVariant('NOT_START')).toBe('neutral')
    expect(taskStatusMapper.getVariant('SUBMITTED')).toBe('yellow')
    expect(taskStatusMapper.getVariant('IN_PROGRESS')).toBe('blue')
    expect(taskStatusMapper.getVariant('FAILURE')).toBe('red')
    expect(taskStatusMapper.getVariant('QUEUED')).toBe('orange')
    expect(taskStatusMapper.getVariant('UNKNOWN')).toBe('neutral')
  })

  test('getLabel returns default for unmapped status', () => {
    expect(taskStatusMapper.getLabel('NONEXISTENT')).toBe('Unknown')
  })
})

describe('taskPlatformMapper', () => {
  test('getLabel returns correct labels for platforms', () => {
    expect(taskPlatformMapper.getLabel('suno')).toBe('suno')
    expect(taskPlatformMapper.getLabel('kling')).toBe('kling')
    expect(taskPlatformMapper.getLabel('runway')).toBe('runway')
    expect(taskPlatformMapper.getLabel('luma')).toBe('luma')
    expect(taskPlatformMapper.getLabel('viggle')).toBe('viggle')
  })

  test('getVariant returns correct variants for platforms', () => {
    expect(taskPlatformMapper.getVariant('suno')).toBe('green')
    expect(taskPlatformMapper.getVariant('kling')).toBe('blue')
    expect(taskPlatformMapper.getVariant('runway')).toBe('violet')
    expect(taskPlatformMapper.getVariant('luma')).toBe('orange')
    expect(taskPlatformMapper.getVariant('viggle')).toBe('pink')
  })

  test('getLabel returns default for unknown platform', () => {
    expect(taskPlatformMapper.getLabel('unknown_platform')).toBe('Unknown')
  })

  test('getVariant returns default for unknown platform', () => {
    expect(taskPlatformMapper.getVariant('unknown_platform')).toBe('neutral')
  })

  test('getLabel returns custom default for unknown platform', () => {
    expect(taskPlatformMapper.getLabel('unknown_platform', 'N/A')).toBe('N/A')
  })

  test('getVariant returns custom default for unknown platform', () => {
    expect(taskPlatformMapper.getVariant('unknown_platform', 'red')).toBe('red')
  })
})

import {
  ATTACHMENT_ACTIONS,
  getAttachmentActionNotice,
  getSearchActionNotice,
} from './input-tool-utils'

describe('ATTACHMENT_ACTIONS', () => {
  test('contains four actions', () => {
    expect(ATTACHMENT_ACTIONS).toHaveLength(4)
  })

  test('has upload-file action', () => {
    expect(ATTACHMENT_ACTIONS[0]).toEqual(
      expect.objectContaining({ action: 'upload-file', label: 'Upload file' })
    )
  })

  test('has upload-photo action', () => {
    expect(ATTACHMENT_ACTIONS[1]).toEqual(
      expect.objectContaining({
        action: 'upload-photo',
        label: 'Upload photo',
      })
    )
  })

  test('has take-screenshot action', () => {
    expect(ATTACHMENT_ACTIONS[2]).toEqual(
      expect.objectContaining({
        action: 'take-screenshot',
        label: 'Take screenshot',
      })
    )
  })

  test('has take-photo action', () => {
    expect(ATTACHMENT_ACTIONS[3]).toEqual(
      expect.objectContaining({
        action: 'take-photo',
        label: 'Take photo',
      })
    )
  })
})

describe('getAttachmentActionNotice', () => {
  test('returns notice with action as description', () => {
    const result = getAttachmentActionNotice('upload-file')
    expect(result).toEqual({
      description: 'upload-file',
      title: 'Feature in development',
    })
  })

  test('returns correct title for any action', () => {
    const result = getAttachmentActionNotice('custom-action')
    expect(result.title).toBe('Feature in development')
    expect(result.description).toBe('custom-action')
  })
})

describe('getSearchActionNotice', () => {
  test('returns notice without description', () => {
    const result = getSearchActionNotice()
    expect(result).toEqual({
      title: 'Search feature in development',
    })
  })

  test('does not include description field', () => {
    const result = getSearchActionNotice()
    expect(result.description).toBeUndefined()
  })
})

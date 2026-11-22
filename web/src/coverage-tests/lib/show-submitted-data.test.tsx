import { describe, it, expect, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { message: vi.fn() },
}))

import { toast } from 'sonner'
import { showSubmittedData } from '@/lib/show-submitted-data'

describe('showSubmittedData', () => {
  it('calls toast.message with default title', () => {
    showSubmittedData({ name: 'test' })
    expect(toast.message).toHaveBeenCalledWith(
      'You submitted the following values:',
      expect.objectContaining({ description: expect.anything() })
    )
  })

  it('calls toast.message with custom title', () => {
    showSubmittedData({ key: 'value' }, 'Custom Title')
    expect(toast.message).toHaveBeenCalledWith(
      'Custom Title',
      expect.objectContaining({ description: expect.anything() })
    )
  })

  it('handles null data', () => {
    showSubmittedData(null)
    expect(toast.message).toHaveBeenCalled()
  })

  it('handles array data', () => {
    showSubmittedData([1, 2, 3])
    expect(toast.message).toHaveBeenCalled()
  })
})

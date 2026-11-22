import { render, screen } from '@/test/test-utils'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'

import { ModelsProvider, useModels } from '@/features/models/components/models-provider'

describe('ModelsProvider', () => {
  test('renders children', () => {
    render(
      <ModelsProvider>
        <div>Test Content</div>
      </ModelsProvider>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})

describe('useModels', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <ModelsProvider>{children}</ModelsProvider>
  }

  test('throws error when used outside ModelsProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useModels())
    }).toThrow('useModels must be used within ModelsProvider')
    consoleSpy.mockRestore()
  })

  test('returns default context values', () => {
    const { result } = renderHook(() => useModels(), { wrapper })

    expect(result.current.open).toBeNull()
    expect(result.current.currentRow).toBeNull()
    expect(result.current.currentVendor).toBeNull()
    expect(result.current.selectedVendor).toBeNull()
    expect(result.current.descriptionData).toBeNull()
    expect(result.current.syncWizardOptions).toEqual({
      locale: 'zh',
      source: 'official',
    })
    expect(result.current.tabCategory).toBe('metadata')
  })

  test('setOpen updates the open state', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setOpen('create-model')
    })
    expect(result.current.open).toBe('create-model')
  })

  test('setOpen accepts null', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setOpen('create-model')
    })
    act(() => {
      result.current.setOpen(null)
    })
    expect(result.current.open).toBeNull()
  })

  test('setCurrentRow updates current row', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    const model = {
      id: 1,
      model_name: 'gpt-4',
      status: 1,
      sync_official: 0,
      created_time: 0,
      updated_time: 0,
      name_rule: 0,
    }
    act(() => {
      result.current.setCurrentRow(model)
    })
    expect(result.current.currentRow).toEqual(model)
  })

  test('setCurrentVendor updates current vendor', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    const vendor = {
      id: 1,
      name: 'OpenAI',
      status: 1,
      created_time: 0,
      updated_time: 0,
    }
    act(() => {
      result.current.setCurrentVendor(vendor)
    })
    expect(result.current.currentVendor).toEqual(vendor)
  })

  test('setSelectedVendor updates selected vendor', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setSelectedVendor('OpenAI')
    })
    expect(result.current.selectedVendor).toBe('OpenAI')
  })

  test('setDescriptionData updates description data', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setDescriptionData({
        modelName: 'gpt-4',
        description: 'A great model',
      })
    })
    expect(result.current.descriptionData).toEqual({
      modelName: 'gpt-4',
      description: 'A great model',
    })
  })

  test('setSyncWizardOptions updates sync options', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setSyncWizardOptions({ locale: 'en', source: 'official' })
    })
    expect(result.current.syncWizardOptions).toEqual({
      locale: 'en',
      source: 'official',
    })
  })

  test('setTabCategory updates tab category', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    act(() => {
      result.current.setTabCategory('deployments')
    })
    expect(result.current.tabCategory).toBe('deployments')
  })

  test('supports all dialog types', () => {
    const { result } = renderHook(() => useModels(), { wrapper })
    const dialogTypes = [
      'create-model',
      'update-model',
      'price-model',
      'create-vendor',
      'vendors',
      'price-sync',
      'update-vendor',
      'missing-models',
      'sync-wizard',
      'prefill-groups',
      'description',
    ] as const

    for (const type of dialogTypes) {
      act(() => {
        result.current.setOpen(type)
      })
      expect(result.current.open).toBe(type)
    }
  })
})

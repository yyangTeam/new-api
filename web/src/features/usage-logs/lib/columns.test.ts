import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useColumnsByCategory } from './columns'

vi.mock('../components/columns/common-logs-columns', () => ({
  useCommonLogsColumns: vi.fn((isAdmin: boolean) => [
    { id: 'common-col', accessorKey: 'id', isAdmin },
  ]),
}))

vi.mock('../components/columns/drawing-logs-columns', () => ({
  useDrawingLogsColumns: vi.fn((isAdmin: boolean) => [
    { id: 'drawing-col', accessorKey: 'mj_id', isAdmin },
  ]),
}))

vi.mock('../components/columns/task-logs-columns', () => ({
  useTaskLogsColumns: vi.fn((isAdmin: boolean) => [
    { id: 'task-col', accessorKey: 'task_id', isAdmin },
  ]),
}))

describe('usage-logs/lib/columns', () => {
  describe('useColumnsByCategory', () => {
    it('returns common columns for "common" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', true)
      )
      expect(result.current).toEqual([
        { id: 'common-col', accessorKey: 'id', isAdmin: true },
      ])
    })

    it('returns drawing columns for "drawing" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('drawing', false)
      )
      expect(result.current).toEqual([
        { id: 'drawing-col', accessorKey: 'mj_id', isAdmin: false },
      ])
    })

    it('returns task columns for "task" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('task', true)
      )
      expect(result.current).toEqual([
        { id: 'task-col', accessorKey: 'task_id', isAdmin: true },
      ])
    })

    it('defaults to common columns for unknown category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('unknown' as any, false)
      )
      expect(result.current).toEqual([
        { id: 'common-col', accessorKey: 'id', isAdmin: false },
      ])
    })

    it('passes isAdmin=true to column hooks', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', true)
      )
      expect(result.current[0]).toHaveProperty('isAdmin', true)
    })

    it('passes isAdmin=false to column hooks', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', false)
      )
      expect(result.current[0]).toHaveProperty('isAdmin', false)
    })
  })
})

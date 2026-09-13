import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useColumnsByCategory } from '@/features/usage-logs/lib/columns'

vi.mock('@/features/usage-logs/components/columns/common-logs-columns', () => ({
  useCommonLogsColumns: vi.fn((isAdmin: boolean, isRoot: boolean) => [
    { id: 'common-col', accessorKey: 'id', isAdmin, isRoot },
  ]),
}))

vi.mock('@/features/usage-logs/components/columns/drawing-logs-columns', () => ({
  useDrawingLogsColumns: vi.fn((isAdmin: boolean) => [
    { id: 'drawing-col', accessorKey: 'mj_id', isAdmin },
  ]),
}))

vi.mock('@/features/usage-logs/components/columns/task-logs-columns', () => ({
  useTaskLogsColumns: vi.fn((isAdmin: boolean, isRoot: boolean) => [
    { id: 'task-col', accessorKey: 'task_id', isAdmin, isRoot },
  ]),
}))

describe('usage-logs/lib/columns', () => {
  describe('useColumnsByCategory', () => {
    it('returns common columns for "common" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', true, false)
      )
      expect(result.current).toEqual([
        { id: 'common-col', accessorKey: 'id', isAdmin: true, isRoot: false },
      ])
    })

    it('returns drawing columns for "drawing" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('drawing', false, false)
      )
      expect(result.current).toEqual([
        { id: 'drawing-col', accessorKey: 'mj_id', isAdmin: false },
      ])
    })

    it('returns task columns for "task" category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('task', true, false)
      )
      expect(result.current).toEqual([
        { id: 'task-col', accessorKey: 'task_id', isAdmin: true, isRoot: false },
      ])
    })

    it('defaults to common columns for unknown category', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('unknown' as any, false, false)
      )
      expect(result.current).toEqual([
        { id: 'common-col', accessorKey: 'id', isAdmin: false, isRoot: false },
      ])
    })

    it('passes isAdmin=true to column hooks', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', true, false)
      )
      expect(result.current[0]).toHaveProperty('isAdmin', true)
    })

    it('passes isAdmin=false to column hooks', () => {
      const { result } = renderHook(() =>
        useColumnsByCategory('common', false, false)
      )
      expect(result.current[0]).toHaveProperty('isAdmin', false)
    })
  })
})

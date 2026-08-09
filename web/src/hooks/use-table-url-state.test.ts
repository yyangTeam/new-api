import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useTableUrlState, type NavigateFn } from './use-table-url-state'

describe('useTableUrlState', () => {
  let navigate: NavigateFn

  beforeEach(() => {
    navigate = vi.fn()
    localStorage.clear()
  })

  describe('pagination', () => {
    it('returns default pagination (page 1, pageSize 20)', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )
      expect(result.current.pagination.pageIndex).toBe(0)
      expect(result.current.pagination.pageSize).toBe(20)
    })

    it('reads page from search params', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 3 }, navigate })
      )
      expect(result.current.pagination.pageIndex).toBe(2)
    })

    it('reads pageSize from search params', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { pageSize: 50 }, navigate })
      )
      expect(result.current.pagination.pageSize).toBe(50)
    })

    it('uses stored pageSize from localStorage when not in URL', () => {
      localStorage.setItem('page-size', '30')
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )
      expect(result.current.pagination.pageSize).toBe(30)
    })

    it('onPaginationChange updates navigation', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )

      act(() => {
        result.current.onPaginationChange({ pageIndex: 2, pageSize: 20 })
      })

      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ search: expect.any(Function) })
      )
    })

    it('onPaginationChange with function updater', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 2 }, navigate })
      )

      act(() => {
        result.current.onPaginationChange((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex + 1,
        }))
      })

      expect(navigate).toHaveBeenCalled()
    })

    it('stores page size to localStorage on change', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )

      act(() => {
        result.current.onPaginationChange({ pageIndex: 0, pageSize: 50 })
      })

      expect(localStorage.getItem('page-size')).toBe('50')
    })

    it('uses custom page key and pageSize key', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { p: 5, ps: 10 },
          navigate,
          pagination: { pageKey: 'p', pageSizeKey: 'ps' },
        })
      )
      expect(result.current.pagination.pageIndex).toBe(4)
      expect(result.current.pagination.pageSize).toBe(10)
    })

    it('uses custom default page', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: {},
          navigate,
          pagination: { defaultPage: 1, defaultPageSize: 10 },
        })
      )
      expect(result.current.pagination.pageIndex).toBe(0)
      expect(result.current.pagination.pageSize).toBe(10)
    })

    it('ensures pageIndex is at least 0', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: -1 }, navigate })
      )
      expect(result.current.pagination.pageIndex).toBe(0)
    })
  })

  describe('globalFilter', () => {
    it('returns global filter from search params', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { filter: 'test' }, navigate })
      )
      expect(result.current.globalFilter).toBe('test')
    })

    it('returns empty string when filter not in search', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )
      expect(result.current.globalFilter).toBe('')
    })

    it('global filter is undefined when disabled', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: {},
          navigate,
          globalFilter: { enabled: false },
        })
      )
      expect(result.current.globalFilter).toBeUndefined()
      expect(result.current.onGlobalFilterChange).toBeUndefined()
    })

    it('onGlobalFilterChange updates the filter and navigates', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )

      act(() => {
        result.current.onGlobalFilterChange!('searchTerm')
      })

      expect(result.current.globalFilter).toBe('searchTerm')
      expect(navigate).toHaveBeenCalled()
    })

    it('onGlobalFilterChange trims by default', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: {}, navigate })
      )

      act(() => {
        result.current.onGlobalFilterChange!('  hello  ')
      })

      expect(result.current.globalFilter).toBe('hello')
    })

    it('onGlobalFilterChange does not trim when trim is false', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: {},
          navigate,
          globalFilter: { trim: false },
        })
      )

      act(() => {
        result.current.onGlobalFilterChange!('  hello  ')
      })

      expect(result.current.globalFilter).toBe('  hello  ')
    })

    it('onGlobalFilterChange with function updater', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { filter: 'old' }, navigate })
      )

      act(() => {
        result.current.onGlobalFilterChange!((prev) => prev + '_new')
      })

      expect(result.current.globalFilter).toBe('old_new')
    })

    it('uses custom global filter key', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { q: 'search' },
          navigate,
          globalFilter: { key: 'q' },
        })
      )
      expect(result.current.globalFilter).toBe('search')
    })
  })

  describe('columnFilters', () => {
    it('initializes column filters from search params (string type)', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { status: 'active' },
          navigate,
          columnFilters: [
            { columnId: 'status', searchKey: 'status', type: 'string' },
          ],
        })
      )
      expect(result.current.columnFilters).toEqual([
        { id: 'status', value: 'active' },
      ])
    })

    it('initializes column filters from search params (array type)', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { tags: ['a', 'b'] },
          navigate,
          columnFilters: [
            { columnId: 'tags', searchKey: 'tags', type: 'array' },
          ],
        })
      )
      expect(result.current.columnFilters).toEqual([
        { id: 'tags', value: ['a', 'b'] },
      ])
    })

    it('skips empty string values', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { status: '  ' },
          navigate,
          columnFilters: [
            { columnId: 'status', searchKey: 'status', type: 'string' },
          ],
        })
      )
      expect(result.current.columnFilters).toEqual([])
    })

    it('skips empty array values', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { tags: [] },
          navigate,
          columnFilters: [
            { columnId: 'tags', searchKey: 'tags', type: 'array' },
          ],
        })
      )
      expect(result.current.columnFilters).toEqual([])
    })

    it('onColumnFiltersChange navigates with serialized patch', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: {},
          navigate,
          columnFilters: [
            { columnId: 'status', searchKey: 'status', type: 'string' },
          ],
        })
      )

      act(() => {
        result.current.onColumnFiltersChange([
          { id: 'status', value: 'pending' },
        ])
      })

      expect(navigate).toHaveBeenCalled()
    })

    it('onColumnFiltersChange with function updater', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { status: 'active' },
          navigate,
          columnFilters: [
            { columnId: 'status', searchKey: 'status', type: 'string' },
          ],
        })
      )

      act(() => {
        result.current.onColumnFiltersChange((prev) => [
          ...prev,
          { id: 'other', value: 'x' },
        ])
      })

      expect(navigate).toHaveBeenCalled()
    })

    it('supports custom serialize/deserialize', () => {
      const { result } = renderHook(() =>
        useTableUrlState({
          search: { ids: '1,2,3' },
          navigate,
          columnFilters: [
            {
              columnId: 'ids',
              searchKey: 'ids',
              type: 'array',
              deserialize: (v: unknown) =>
                typeof v === 'string' ? v.split(',') : [],
              serialize: (v: unknown) =>
                Array.isArray(v) ? v.join(',') : '',
            },
          ],
        })
      )
      expect(result.current.columnFilters).toEqual([
        { id: 'ids', value: ['1', '2', '3'] },
      ])
    })
  })

  describe('ensurePageInRange', () => {
    it('navigates when current page exceeds page count', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 10 }, navigate })
      )

      act(() => {
        result.current.ensurePageInRange(5)
      })

      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ replace: true })
      )
    })

    it('does nothing when current page is within range', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 3 }, navigate })
      )

      act(() => {
        result.current.ensurePageInRange(5)
      })

      expect(navigate).not.toHaveBeenCalled()
    })

    it('does nothing when pageCount is 0', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 3 }, navigate })
      )

      act(() => {
        result.current.ensurePageInRange(0)
      })

      expect(navigate).not.toHaveBeenCalled()
    })

    it('resetTo last navigates to last page', () => {
      const mockNav = vi.fn()
      const { result } = renderHook(() =>
        useTableUrlState({ search: { page: 10 }, navigate: mockNav })
      )

      act(() => {
        result.current.ensurePageInRange(5, { resetTo: 'last' })
      })

      expect(mockNav).toHaveBeenCalled()
      const searchFn = mockNav.mock.calls[0][0].search
      const patchResult = searchFn({ page: 10 })
      expect(patchResult.page).toBe(5)
    })
  })
})

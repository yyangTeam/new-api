import { describe, it, expect } from 'vitest'

import {
  modelsQueryKeys,
  vendorsQueryKeys,
  prefillGroupsQueryKeys,
  deploymentsQueryKeys,
} from './query-keys'

describe('modelsQueryKeys', () => {
  it('all returns ["models"]', () => {
    expect(modelsQueryKeys.all).toEqual(['models'])
  })

  it('lists returns ["models", "list"]', () => {
    expect(modelsQueryKeys.lists()).toEqual(['models', 'list'])
  })

  it('list appends filters', () => {
    const filters = { p: 1, page_size: 20 }
    expect(modelsQueryKeys.list(filters)).toEqual(['models', 'list', filters])
  })

  it('detail includes id', () => {
    expect(modelsQueryKeys.detail(42)).toEqual(['models', 'detail', 42])
  })

  it('missing returns expected key', () => {
    expect(modelsQueryKeys.missing()).toEqual(['models', 'missing'])
  })
})

describe('vendorsQueryKeys', () => {
  it('all returns ["vendors"]', () => {
    expect(vendorsQueryKeys.all).toEqual(['vendors'])
  })

  it('lists returns ["vendors", "list"]', () => {
    expect(vendorsQueryKeys.lists()).toEqual(['vendors', 'list'])
  })

  it('list appends filters', () => {
    const filters = { keyword: 'open' }
    expect(vendorsQueryKeys.list(filters)).toEqual(['vendors', 'list', filters])
  })

  it('list works without filters', () => {
    expect(vendorsQueryKeys.list()).toEqual(['vendors', 'list', undefined])
  })

  it('detail includes id', () => {
    expect(vendorsQueryKeys.detail(7)).toEqual(['vendors', 'detail', 7])
  })
})

describe('prefillGroupsQueryKeys', () => {
  it('all returns ["prefill-groups"]', () => {
    expect(prefillGroupsQueryKeys.all).toEqual(['prefill-groups'])
  })

  it('lists returns expected key', () => {
    expect(prefillGroupsQueryKeys.lists()).toEqual(['prefill-groups', 'list'])
  })

  it('list includes type', () => {
    expect(prefillGroupsQueryKeys.list('model')).toEqual(['prefill-groups', 'list', 'model'])
  })

  it('list works without type', () => {
    expect(prefillGroupsQueryKeys.list()).toEqual(['prefill-groups', 'list', undefined])
  })
})

describe('deploymentsQueryKeys', () => {
  it('all returns ["deployments"]', () => {
    expect(deploymentsQueryKeys.all).toEqual(['deployments'])
  })

  it('lists returns expected key', () => {
    expect(deploymentsQueryKeys.lists()).toEqual(['deployments', 'list'])
  })

  it('list includes filters', () => {
    const filters = { status: 'running', p: 1 }
    expect(deploymentsQueryKeys.list(filters)).toEqual(['deployments', 'list', filters])
  })

  it('detail includes id', () => {
    expect(deploymentsQueryKeys.detail('d-123')).toEqual(['deployments', 'detail', 'd-123'])
  })

  it('detail works with numeric id', () => {
    expect(deploymentsQueryKeys.detail(99)).toEqual(['deployments', 'detail', 99])
  })
})

import { describe, it, expect } from 'vitest'

// types.ts is a pure type definitions file with no runtime logic.
// We verify that the module can be imported without error and that
// the exported type structures are importable.
import type {
  SystemOption,
  SystemOptionsResponse,
  UpdateOptionRequest,
  UpdateOptionResponse,
  ConfirmPaymentComplianceResponse,
  SystemTaskStatus,
  SystemTask,
  LogCleanupTask,
  SystemTaskResponse,
  SystemTaskListResponse,
  SiteSettings,
  AuthSettings,
  ContentSettings,
  ModelSettings,
  BillingSettings,
  OperationsSettings,
  SecuritySettings,
  UpstreamChannel,
  RatioType,
  RatioDifference,
  DifferencesMap,
  UpstreamChannelsResponse,
  UpstreamConfig,
  FetchUpstreamRatiosRequest,
  TestResult,
  UpstreamRatiosResponse,
} from './types'

describe('system-settings types', () => {
  it('exports SystemOption type with expected shape', () => {
    const opt: SystemOption = { key: 'test', value: 'val' }
    expect(opt.key).toBe('test')
    expect(opt.value).toBe('val')
  })

  it('exports UpdateOptionRequest type', () => {
    const req: UpdateOptionRequest = { key: 'k', value: 'v' }
    expect(req.key).toBe('k')
  })

  it('exports UpdateOptionResponse type', () => {
    const res: UpdateOptionResponse = { success: true, message: 'ok' }
    expect(res.success).toBe(true)
  })

  it('exports SystemTaskStatus literal union', () => {
    const statuses: SystemTaskStatus[] = [
      'pending',
      'running',
      'succeeded',
      'failed',
    ]
    expect(statuses).toHaveLength(4)
  })

  it('exports SystemTask type', () => {
    const task: SystemTask = {
      id: 1,
      task_id: 'abc',
      type: 'log_cleanup',
      status: 'running',
      created_at: 1700000000,
      updated_at: 1700000000,
    }
    expect(task.status).toBe('running')
  })

  it('exports RatioType literal union', () => {
    const types: RatioType[] = [
      'model_ratio',
      'completion_ratio',
      'cache_ratio',
      'create_cache_ratio',
      'image_ratio',
      'audio_ratio',
      'audio_completion_ratio',
      'model_price',
      'billing_mode',
      'billing_expr',
    ]
    expect(types).toHaveLength(10)
  })

  it('exports UpstreamChannel type', () => {
    const ch: UpstreamChannel = {
      id: 1,
      name: 'test',
      base_url: 'https://x.com',
      status: 1,
    }
    expect(ch.id).toBe(1)
  })

  it('exports TestResult type', () => {
    const r: TestResult = { name: 'ch1', status: 'success' }
    expect(r.status).toBe('success')

    const r2: TestResult = { name: 'ch2', status: 'error', error: 'timeout' }
    expect(r2.error).toBe('timeout')
  })
})

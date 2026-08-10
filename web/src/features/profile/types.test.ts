import type {
  ApiResponse,
  UserProfile,
  UserSettings,
  NotifyType,
  UpdateUserRequest,
  TwoFAStatus,
  TwoFASetupData,
  CheckinRecord,
  CheckinStats,
  CheckinStatusResponse,
  CheckinResponse,
  BindingItem,
} from './types'

describe('profile types', () => {
  test('ApiResponse basic structure', () => {
    const response: ApiResponse<string> = {
      success: true,
      message: 'ok',
      data: 'test',
    }
    expect(response.success).toBe(true)
  })

  test('ApiResponse without optional fields', () => {
    const response: ApiResponse = { success: false }
    expect(response.data).toBeUndefined()
  })

  test('UserProfile complete structure', () => {
    const profile: UserProfile = {
      id: 1,
      username: 'test',
      display_name: 'Test',
      role: 1,
      group: 'default',
      quota: 100,
      used_quota: 50,
      request_count: 10,
      status: 1,
      aff_count: 0,
      aff_quota: 0,
      aff_history_quota: 0,
      created_time: 1700000000,
    }
    expect(profile.id).toBe(1)
  })

  test('UserProfile with optional OAuth fields', () => {
    const profile: UserProfile = {
      id: 1,
      username: 'test',
      display_name: 'Test',
      role: 1,
      group: 'default',
      quota: 100,
      used_quota: 50,
      request_count: 10,
      status: 1,
      aff_count: 0,
      aff_quota: 0,
      aff_history_quota: 0,
      created_time: 1700000000,
      wechat_id: 'wx123',
      github_id: 'gh456',
      discord_id: 'dc789',
      telegram_id: 'tg101',
      oidc_id: 'oidc',
      linux_do_id: 'ld',
    }
    expect(profile.wechat_id).toBe('wx123')
  })

  test('NotifyType values', () => {
    const types: NotifyType[] = ['email', 'webhook', 'bark', 'gotify', 'feishu', 'qqbot']
    expect(types).toHaveLength(6)
  })

  test('UserSettings structure', () => {
    const settings: UserSettings = {
      notify_type: 'email',
      quota_warning_threshold: 500000,
      notify_cooldown_minutes: 60,
      webhook_url: 'https://example.com',
      bark_url: 'https://bark.example.com',
      gotify_url: 'https://gotify.example.com',
      gotify_token: 'token',
      gotify_priority: 5,
      feishu_webhook_url: 'https://feishu.example.com',
      accept_unset_model_ratio_model: true,
      record_ip_log: false,
      language: 'en',
    }
    expect(settings.notify_type).toBe('email')
  })

  test('UpdateUserRequest structure', () => {
    const req: UpdateUserRequest = {
      display_name: 'New Name',
      password: 'newpass',
      original_password: 'oldpass',
    }
    expect(req.display_name).toBe('New Name')
  })

  test('TwoFAStatus structure', () => {
    const status: TwoFAStatus = {
      enabled: true,
      locked: false,
      backup_codes_remaining: 8,
    }
    expect(status.enabled).toBe(true)
  })

  test('TwoFASetupData structure', () => {
    const data: TwoFASetupData = {
      secret: 'JBSWY3DPEHPK3PXP',
      qr_code_data: 'data:image/png;base64,...',
      backup_codes: ['code1', 'code2'],
    }
    expect(data.backup_codes).toHaveLength(2)
  })

  test('CheckinRecord structure', () => {
    const record: CheckinRecord = {
      checkin_date: '2024-01-15',
      quota_awarded: 10000,
    }
    expect(record.checkin_date).toBe('2024-01-15')
  })

  test('CheckinStats structure', () => {
    const stats: CheckinStats = {
      checked_in_today: true,
      total_checkins: 30,
      total_quota: 300000,
      checkin_count: 15,
      records: [],
    }
    expect(stats.checked_in_today).toBe(true)
  })

  test('CheckinStatusResponse structure', () => {
    const response: CheckinStatusResponse = {
      enabled: true,
      stats: {
        checked_in_today: false,
        total_checkins: 0,
        total_quota: 0,
        checkin_count: 0,
        records: [],
      },
    }
    expect(response.enabled).toBe(true)
  })

  test('CheckinResponse structure', () => {
    const response: CheckinResponse = {
      quota_awarded: 5000,
    }
    expect(response.quota_awarded).toBe(5000)
  })
})

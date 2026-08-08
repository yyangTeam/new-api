import {
  isValidOTP,
  isValidBackupCode,
  formatBackupCode,
  cleanBackupCode,
  isValidEmail,
} from './validation'

describe('isValidOTP', () => {
  test('accepts valid 6-digit codes', () => {
    expect(isValidOTP('123456')).toBe(true)
    expect(isValidOTP('000000')).toBe(true)
    expect(isValidOTP('999999')).toBe(true)
  })

  test('rejects codes with wrong length', () => {
    expect(isValidOTP('')).toBe(false)
    expect(isValidOTP('12345')).toBe(false)
    expect(isValidOTP('1234567')).toBe(false)
  })

  test('rejects codes with non-digit characters', () => {
    expect(isValidOTP('12345a')).toBe(false)
    expect(isValidOTP('abcdef')).toBe(false)
    expect(isValidOTP('12 456')).toBe(false)
    expect(isValidOTP('123-56')).toBe(false)
  })
})

describe('isValidBackupCode', () => {
  test('accepts valid XXXX-XXXX format', () => {
    expect(isValidBackupCode('ABCD-1234')).toBe(true)
    expect(isValidBackupCode('1234-ABCD')).toBe(true)
    expect(isValidBackupCode('A1B2-C3D4')).toBe(true)
  })

  test('is case insensitive', () => {
    expect(isValidBackupCode('abcd-1234')).toBe(true)
    expect(isValidBackupCode('AbCd-EfGh')).toBe(true)
  })

  test('rejects codes without hyphen', () => {
    expect(isValidBackupCode('ABCD1234')).toBe(false)
  })

  test('rejects codes with wrong segment lengths', () => {
    expect(isValidBackupCode('ABC-1234')).toBe(false)
    expect(isValidBackupCode('ABCDE-1234')).toBe(false)
    expect(isValidBackupCode('ABCD-123')).toBe(false)
    expect(isValidBackupCode('ABCD-12345')).toBe(false)
  })

  test('rejects empty string', () => {
    expect(isValidBackupCode('')).toBe(false)
  })

  test('rejects codes with special characters', () => {
    expect(isValidBackupCode('AB!D-1234')).toBe(false)
    expect(isValidBackupCode('ABCD-12 4')).toBe(false)
  })
})

describe('formatBackupCode', () => {
  test('converts to uppercase', () => {
    expect(formatBackupCode('abcd')).toBe('ABCD')
    expect(formatBackupCode('abcdefgh')).toBe('ABCD-EFGH')
  })

  test('inserts hyphen after 4th character', () => {
    expect(formatBackupCode('ABCDE')).toBe('ABCD-E')
    expect(formatBackupCode('ABCDEFGH')).toBe('ABCD-EFGH')
  })

  test('strips non-alphanumeric characters', () => {
    expect(formatBackupCode('AB-CD-EF')).toBe('ABCD-EF')
    expect(formatBackupCode('A!B@C#D$E')).toBe('ABCD-E')
  })

  test('truncates to 8 alphanumeric characters', () => {
    expect(formatBackupCode('ABCDEFGHIJKL')).toBe('ABCD-EFGH')
  })

  test('handles short inputs without hyphen', () => {
    expect(formatBackupCode('')).toBe('')
    expect(formatBackupCode('A')).toBe('A')
    expect(formatBackupCode('ABCD')).toBe('ABCD')
  })

  test('handles input that is already formatted', () => {
    expect(formatBackupCode('ABCD-EFGH')).toBe('ABCD-EFGH')
  })
})

describe('cleanBackupCode', () => {
  test('removes hyphens', () => {
    expect(cleanBackupCode('ABCD-EFGH')).toBe('ABCDEFGH')
  })

  test('removes multiple hyphens', () => {
    expect(cleanBackupCode('AB-CD-EF-GH')).toBe('ABCDEFGH')
  })

  test('returns same string when no hyphens', () => {
    expect(cleanBackupCode('ABCDEFGH')).toBe('ABCDEFGH')
  })

  test('handles empty string', () => {
    expect(cleanBackupCode('')).toBe('')
  })
})

describe('isValidEmail', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co')).toBe(true)
    expect(isValidEmail('user+tag@example.org')).toBe(true)
    expect(isValidEmail('a@b.c')).toBe(true)
  })

  test('rejects emails without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
  })

  test('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user@.com')).toBe(false)
  })

  test('rejects emails without local part', () => {
    expect(isValidEmail('@example.com')).toBe(false)
  })

  test('rejects emails without TLD dot', () => {
    expect(isValidEmail('user@example')).toBe(false)
  })

  test('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
    expect(isValidEmail('user@ example.com')).toBe(false)
    expect(isValidEmail('user@example .com')).toBe(false)
  })

  test('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })
})

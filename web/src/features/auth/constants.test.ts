import {
  loginFormSchema,
  registerFormSchema,
  forgotPasswordFormSchema,
  otpFormSchema,
} from './constants'

describe('loginFormSchema', () => {
  test('accepts valid login data', () => {
    const result = loginFormSchema.safeParse({
      username: 'testuser',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  test('accepts email as username', () => {
    const result = loginFormSchema.safeParse({
      username: 'user@example.com',
      password: 'mypassword',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty username', () => {
    const result = loginFormSchema.safeParse({
      username: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty password', () => {
    const result = loginFormSchema.safeParse({
      username: 'testuser',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing username field', () => {
    const result = loginFormSchema.safeParse({
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing password field', () => {
    const result = loginFormSchema.safeParse({
      username: 'testuser',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-string username', () => {
    const result = loginFormSchema.safeParse({
      username: 123,
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerFormSchema', () => {
  test('accepts valid registration data', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  test('accepts valid data with optional email', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  test('accepts data without email', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  test('rejects password shorter than 8 characters', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
  })

  test('rejects password longer than 20 characters', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'a'.repeat(21),
      confirmPassword: 'a'.repeat(21),
    })
    expect(result.success).toBe(false)
  })

  test('accepts password of exactly 8 characters', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(result.success).toBe(true)
  })

  test('accepts password of exactly 20 characters', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'a'.repeat(20),
      confirmPassword: 'a'.repeat(20),
    })
    expect(result.success).toBe(true)
  })

  test('rejects mismatched passwords', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'password123',
      confirmPassword: 'differentpass',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('confirmPassword')
    }
  })

  test('rejects empty username', () => {
    const result = registerFormSchema.safeParse({
      username: '',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty password', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: '',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty confirmPassword', () => {
    const result = registerFormSchema.safeParse({
      username: 'newuser',
      password: 'password123',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordFormSchema', () => {
  test('accepts valid email', () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid email format', () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty email', () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: '',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing email field', () => {
    const result = forgotPasswordFormSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('rejects email without domain', () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: 'user@',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-string email', () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: 12345,
    })
    expect(result.success).toBe(false)
  })
})

describe('otpFormSchema', () => {
  test('accepts valid OTP', () => {
    const result = otpFormSchema.safeParse({
      otp: '123456',
    })
    expect(result.success).toBe(true)
  })

  test('accepts any non-empty string', () => {
    const result = otpFormSchema.safeParse({
      otp: 'abc',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty OTP', () => {
    const result = otpFormSchema.safeParse({
      otp: '',
    })
    expect(result.success).toBe(false)
  })

  test('rejects missing OTP field', () => {
    const result = otpFormSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('rejects non-string OTP', () => {
    const result = otpFormSchema.safeParse({
      otp: 123456,
    })
    expect(result.success).toBe(false)
  })
})

import { render } from '@/test/test-utils'

import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './input-otp'

describe('InputOTP', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelector('[data-slot="input-otp"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <InputOTP maxLength={4} className='custom-otp'>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelector('[data-slot="input-otp"]')
    ).toBeInTheDocument()
  })

  test('applies containerClassName', () => {
    const { container } = render(
      <InputOTP maxLength={2} containerClassName='container-cls'>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(container.querySelector('.container-cls')).toBeInTheDocument()
  })
})

describe('InputOTPGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <InputOTP maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelector('[data-slot="input-otp-group"]')
    ).toBeInTheDocument()
  })
})

describe('InputOTPSlot', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <InputOTP maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelector('[data-slot="input-otp-slot"]')
    ).toBeInTheDocument()
  })
})

describe('InputOTPSeparator', () => {
  test('renders with role=separator', () => {
    const { container } = render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelector('[role="separator"]')
    ).toBeInTheDocument()
  })
})

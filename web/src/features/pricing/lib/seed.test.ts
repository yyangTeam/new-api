import {
  hashStringToSeed,
  seededRandom,
  randomInRange,
  randomIntInRange,
} from './seed'

describe('hashStringToSeed', () => {
  test('returns a non-negative integer', () => {
    const seed = hashStringToSeed('test')
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(seed)).toBe(true)
  })

  test('returns the same seed for the same input', () => {
    expect(hashStringToSeed('hello')).toBe(hashStringToSeed('hello'))
  })

  test('returns different seeds for different inputs', () => {
    expect(hashStringToSeed('hello')).not.toBe(hashStringToSeed('world'))
  })

  test('handles empty string', () => {
    const seed = hashStringToSeed('')
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(seed)).toBe(true)
  })

  test('handles special characters', () => {
    const seed = hashStringToSeed('gpt-4o/v2@latest')
    expect(seed).toBeGreaterThanOrEqual(0)
  })
})

describe('seededRandom', () => {
  test('returns a function', () => {
    const rand = seededRandom(42)
    expect(typeof rand).toBe('function')
  })

  test('produces values in [0, 1)', () => {
    const rand = seededRandom(12345)
    for (let i = 0; i < 100; i++) {
      const value = rand()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  test('produces deterministic sequence for the same seed', () => {
    const rand1 = seededRandom(42)
    const rand2 = seededRandom(42)
    for (let i = 0; i < 10; i++) {
      expect(rand1()).toBe(rand2())
    }
  })

  test('produces different sequences for different seeds', () => {
    const rand1 = seededRandom(1)
    const rand2 = seededRandom(2)
    const values1 = Array.from({ length: 5 }, () => rand1())
    const values2 = Array.from({ length: 5 }, () => rand2())
    expect(values1).not.toEqual(values2)
  })

  test('handles seed of 0 by using 1 instead', () => {
    const rand = seededRandom(0)
    const value = rand()
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })
})

describe('randomInRange', () => {
  test('returns value within [min, max]', () => {
    const rand = seededRandom(42)
    for (let i = 0; i < 100; i++) {
      const value = randomInRange(rand, 10, 20)
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  test('returns min when rand returns 0', () => {
    const rand = () => 0
    expect(randomInRange(rand, 5, 10)).toBe(5)
  })

  test('approaches max when rand approaches 1', () => {
    const rand = () => 0.999999
    const value = randomInRange(rand, 5, 10)
    expect(value).toBeGreaterThan(9.99)
    expect(value).toBeLessThanOrEqual(10)
  })

  test('works with negative ranges', () => {
    const rand = () => 0.5
    expect(randomInRange(rand, -10, -5)).toBe(-7.5)
  })
})

describe('randomIntInRange', () => {
  test('returns integers within [min, max] inclusive', () => {
    const rand = seededRandom(42)
    for (let i = 0; i < 100; i++) {
      const value = randomIntInRange(rand, 1, 6)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
  })

  test('returns min when rand returns 0', () => {
    const rand = () => 0
    expect(randomIntInRange(rand, 3, 7)).toBe(3)
  })

  test('returns max when rand is close to 1', () => {
    const rand = () => 0.99
    expect(randomIntInRange(rand, 1, 5)).toBe(5)
  })

  test('handles single value range', () => {
    const rand = seededRandom(42)
    expect(randomIntInRange(rand, 5, 5)).toBe(5)
  })
})

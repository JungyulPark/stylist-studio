import { describe, it, expect } from 'vitest'
import {
  isValidGender,
  isValidLanguage,
  isValidHeight,
  isValidWeight,
  isValidPhoto,
  isValidStyleId,
  isValidStylesArray,
  validateAnalyzeRequest,
  validateTransformBatchRequest,
  validateCheckoutRequest,
} from './validation'

describe('isValidGender', () => {
  it('accepts valid genders', () => {
    expect(isValidGender('male')).toBe(true)
    expect(isValidGender('female')).toBe(true)
    expect(isValidGender('other')).toBe(true)
  })

  it('rejects invalid genders', () => {
    expect(isValidGender('invalid')).toBe(false)
    expect(isValidGender('')).toBe(false)
    expect(isValidGender(null)).toBe(false)
    expect(isValidGender(undefined)).toBe(false)
    expect(isValidGender(123)).toBe(false)
  })
})

describe('isValidLanguage', () => {
  it('accepts valid languages', () => {
    expect(isValidLanguage('ko')).toBe(true)
    expect(isValidLanguage('en')).toBe(true)
    expect(isValidLanguage('ja')).toBe(true)
    expect(isValidLanguage('zh')).toBe(true)
    expect(isValidLanguage('es')).toBe(true)
  })

  it('rejects invalid languages', () => {
    expect(isValidLanguage('fr')).toBe(false)
    expect(isValidLanguage('de')).toBe(false)
    expect(isValidLanguage('')).toBe(false)
    expect(isValidLanguage(null)).toBe(false)
  })
})

describe('isValidHeight', () => {
  it('accepts valid heights', () => {
    expect(isValidHeight('170')).toBe(true)
    expect(isValidHeight('50')).toBe(true)
    expect(isValidHeight('300')).toBe(true)
    expect(isValidHeight(175)).toBe(true)
  })

  it('rejects invalid heights', () => {
    expect(isValidHeight('49')).toBe(false)
    expect(isValidHeight('301')).toBe(false)
    expect(isValidHeight('abc')).toBe(false)
    expect(isValidHeight('')).toBe(false)
    expect(isValidHeight(null)).toBe(false)
  })
})

describe('isValidWeight', () => {
  it('accepts valid weights', () => {
    expect(isValidWeight('70')).toBe(true)
    expect(isValidWeight('20')).toBe(true)
    expect(isValidWeight('500')).toBe(true)
    expect(isValidWeight(65)).toBe(true)
  })

  it('rejects invalid weights', () => {
    expect(isValidWeight('19')).toBe(false)
    expect(isValidWeight('501')).toBe(false)
    expect(isValidWeight('abc')).toBe(false)
    expect(isValidWeight(null)).toBe(false)
  })
})

describe('isValidPhoto', () => {
  it('accepts valid photos', () => {
    // Empty is valid (no photo)
    expect(isValidPhoto('')).toBe(true)

    // Valid data URI
    const validJpeg = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    const validPng = 'data:image/png;base64,' + 'B'.repeat(100)
    expect(isValidPhoto(validJpeg)).toBe(true)
    expect(isValidPhoto(validPng)).toBe(true)
  })

  it('rejects invalid photos', () => {
    expect(isValidPhoto(null)).toBe(false)
    expect(isValidPhoto(123)).toBe(false)
    expect(isValidPhoto('not-base64')).toBe(false)
    // Too short
    expect(isValidPhoto('data:image/jpeg;base64,ABC')).toBe(false)
  })
})

describe('isValidStyleId', () => {
  it('accepts valid style IDs', () => {
    expect(isValidStyleId('classic-short')).toBe(true)
    expect(isValidStyleId('two-block')).toBe(true)
    expect(isValidStyleId('style123')).toBe(true)
  })

  it('rejects invalid style IDs', () => {
    expect(isValidStyleId('')).toBe(false)
    expect(isValidStyleId('Style With Spaces')).toBe(false)
    expect(isValidStyleId('style_underscore')).toBe(false)
    expect(isValidStyleId(null)).toBe(false)
  })
})

describe('isValidStylesArray', () => {
  it('accepts valid styles arrays', () => {
    expect(isValidStylesArray(['style1', 'style2'])).toBe(true)
    expect(isValidStylesArray(['a'])).toBe(true)
  })

  it('rejects invalid styles arrays', () => {
    expect(isValidStylesArray([])).toBe(false)
    expect(isValidStylesArray(null)).toBe(false)
    expect(isValidStylesArray('not-array')).toBe(false)
    expect(isValidStylesArray([1, 2, 3])).toBe(false)
  })
})

describe('validateAnalyzeRequest', () => {
  it('validates correct request', () => {
    const result = validateAnalyzeRequest({
      height: '175',
      weight: '70',
      gender: 'male',
      language: 'ko',
    })

    expect(result.valid).toBe(true)
    expect(result.data).toEqual({
      photo: undefined,
      height: '175',
      weight: '70',
      gender: 'male',
      language: 'ko',
    })
  })

  it('defaults language to en', () => {
    const result = validateAnalyzeRequest({
      height: '175',
      weight: '70',
      gender: 'male',
    })

    expect(result.valid).toBe(true)
    expect(result.data?.language).toBe('en')
  })

  it('rejects missing required fields', () => {
    const result = validateAnalyzeRequest({})

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3) // height, weight, gender
  })

  it('rejects invalid values', () => {
    const result = validateAnalyzeRequest({
      height: '999',
      weight: '10',
      gender: 'invalid',
      language: 'xx',
    })

    expect(result.valid).toBe(false)
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})

describe('validateTransformBatchRequest', () => {
  it('validates correct request', () => {
    const photo = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    const result = validateTransformBatchRequest({
      photo,
      type: 'hairstyle',
      gender: 'female',
      language: 'en',
    })

    expect(result.valid).toBe(true)
    expect(result.data?.type).toBe('hairstyle')
  })

  it('rejects missing photo', () => {
    const result = validateTransformBatchRequest({
      type: 'hairstyle',
      gender: 'male',
    })

    expect(result.valid).toBe(false)
    expect(result.errors?.some(e => e.field === 'photo')).toBe(true)
  })
})

describe('validateCheckoutRequest', () => {
  it('accepts empty body', () => {
    const result = validateCheckoutRequest({})
    expect(result.valid).toBe(true)
  })

  it('validates productId format', () => {
    const result = validateCheckoutRequest({
      productId: 'invalid-uuid',
    })

    expect(result.valid).toBe(false)
    expect(result.errors?.some(e => e.field === 'productId')).toBe(true)
  })

  it('accepts valid UUID', () => {
    const result = validateCheckoutRequest({
      productId: 'cca7d48e-6758-4e83-a375-807ab70615ea',
    })

    expect(result.valid).toBe(true)
  })
})

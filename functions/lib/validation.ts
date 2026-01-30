/**
 * Input Validation utilities
 *
 * This module provides centralized input validation for all API endpoints.
 * All user input should be validated before processing.
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult<T> {
  valid: boolean
  errors?: ValidationError[]
  data?: T
}

// Valid values
const VALID_GENDERS = ['male', 'female', 'other'] as const
const VALID_LANGUAGES = ['ko', 'en', 'ja', 'zh', 'es'] as const
const VALID_TRANSFORM_TYPES = ['hairstyle', 'fashion'] as const

// Limits (relaxed for edge cases)
const HEIGHT_MIN = 50   // Allow children/short people
const HEIGHT_MAX = 300  // Allow very tall people
const WEIGHT_MIN = 20   // Allow children/underweight
const WEIGHT_MAX = 500  // Allow very heavy people
const PHOTO_MIN_LENGTH = 50 // Minimum base64 length for a valid image
const PHOTO_MAX_LENGTH = 15 * 1024 * 1024 // 15MB max

export type Gender = typeof VALID_GENDERS[number]
export type Language = typeof VALID_LANGUAGES[number]
export type TransformType = typeof VALID_TRANSFORM_TYPES[number]

/**
 * Validate gender value
 */
export function isValidGender(value: unknown): value is Gender {
  return typeof value === 'string' && VALID_GENDERS.includes(value as Gender)
}

/**
 * Validate language value
 */
export function isValidLanguage(value: unknown): value is Language {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as Language)
}

/**
 * Validate transform type
 */
export function isValidTransformType(value: unknown): value is TransformType {
  return typeof value === 'string' && VALID_TRANSFORM_TYPES.includes(value as TransformType)
}

/**
 * Validate height (100-250 cm)
 */
export function isValidHeight(value: unknown): boolean {
  if (typeof value === 'string') {
    const num = parseInt(value, 10)
    return !isNaN(num) && num >= HEIGHT_MIN && num <= HEIGHT_MAX
  }
  if (typeof value === 'number') {
    return value >= HEIGHT_MIN && value <= HEIGHT_MAX
  }
  return false
}

/**
 * Validate weight (30-300 kg)
 */
export function isValidWeight(value: unknown): boolean {
  if (typeof value === 'string') {
    const num = parseInt(value, 10)
    return !isNaN(num) && num >= WEIGHT_MIN && num <= WEIGHT_MAX
  }
  if (typeof value === 'number') {
    return value >= WEIGHT_MIN && value <= WEIGHT_MAX
  }
  return false
}

/**
 * Validate base64 image data
 */
export function isValidPhoto(value: unknown): boolean {
  if (typeof value !== 'string') return false

  // Empty string is valid (no photo)
  if (value === '') return true

  // Check length
  if (value.length < PHOTO_MIN_LENGTH) return false
  if (value.length > PHOTO_MAX_LENGTH) return false

  // Check for valid data URI format (flexible matching)
  // Supports: data:image/TYPE;base64, or just base64 string
  if (value.startsWith('data:image/')) {
    return value.includes(';base64,')
  }

  // Also accept raw base64 strings (legacy support)
  // Base64 only contains: A-Z, a-z, 0-9, +, /, =
  if (/^[A-Za-z0-9+/]+=*$/.test(value.substring(0, 100))) {
    return true
  }

  return false
}

/**
 * Validate style ID (alphanumeric with dashes)
 */
export function isValidStyleId(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[a-z0-9-]+$/.test(value) && value.length > 0 && value.length <= 50
}

/**
 * Validate styles array
 */
export function isValidStylesArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  if (value.length === 0 || value.length > 10) return false
  return value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 100)
}

// ===== Request Body Validators =====

export interface AnalyzeRequestBody {
  photo?: string
  height: string
  weight: string
  gender: Gender
  language: Language
}

export function validateAnalyzeRequest(body: unknown): ValidationResult<AnalyzeRequestBody> {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
  }

  const { photo, height, weight, gender, language } = body as Record<string, unknown>

  // Height validation (required)
  if (!height) {
    errors.push({ field: 'height', message: 'Height is required' })
  } else if (!isValidHeight(height)) {
    errors.push({ field: 'height', message: `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm` })
  }

  // Weight validation (required)
  if (!weight) {
    errors.push({ field: 'weight', message: 'Weight is required' })
  } else if (!isValidWeight(weight)) {
    errors.push({ field: 'weight', message: `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg` })
  }

  // Gender validation (required)
  if (!gender) {
    errors.push({ field: 'gender', message: 'Gender is required' })
  } else if (!isValidGender(gender)) {
    errors.push({ field: 'gender', message: 'Invalid gender value' })
  }

  // Language validation (optional, defaults to 'en')
  if (language && !isValidLanguage(language)) {
    errors.push({ field: 'language', message: 'Invalid language value' })
  }

  // Photo validation (optional)
  if (photo && !isValidPhoto(photo)) {
    errors.push({ field: 'photo', message: 'Invalid photo format or size' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      photo: photo as string | undefined,
      height: String(height),
      weight: String(weight),
      gender: gender as Gender,
      language: (language as Language) || 'en',
    },
  }
}

export interface TransformBatchRequestBody {
  photo: string
  type: TransformType
  gender: Gender
  language: Language
}

export function validateTransformBatchRequest(body: unknown): ValidationResult<TransformBatchRequestBody> {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
  }

  const { photo, type, gender, language } = body as Record<string, unknown>

  // Photo validation (required)
  if (!photo) {
    errors.push({ field: 'photo', message: 'Photo is required' })
  } else if (!isValidPhoto(photo)) {
    errors.push({ field: 'photo', message: 'Invalid photo format or size' })
  }

  // Type validation (optional, defaults to 'hairstyle')
  if (type && !isValidTransformType(type)) {
    errors.push({ field: 'type', message: 'Invalid transform type' })
  }

  // Gender validation (optional, defaults to 'male')
  if (gender && !isValidGender(gender)) {
    errors.push({ field: 'gender', message: 'Invalid gender value' })
  }

  // Language validation (optional, defaults to 'en')
  if (language && !isValidLanguage(language)) {
    errors.push({ field: 'language', message: 'Invalid language value' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      photo: photo as string,
      type: (type as TransformType) || 'hairstyle',
      gender: (gender as Gender) || 'male',
      language: (language as Language) || 'en',
    },
  }
}

export interface TransformStyleRequestBody {
  photo: string
  type: TransformType
  style: string
  gender: Gender
  language: Language
}

export function validateTransformStyleRequest(body: unknown): ValidationResult<TransformStyleRequestBody> {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
  }

  const { photo, type, style, gender, language } = body as Record<string, unknown>

  // Photo validation (required)
  if (!photo) {
    errors.push({ field: 'photo', message: 'Photo is required' })
  } else if (!isValidPhoto(photo)) {
    errors.push({ field: 'photo', message: 'Invalid photo format or size' })
  }

  // Type validation (required)
  if (!type) {
    errors.push({ field: 'type', message: 'Transform type is required' })
  } else if (!isValidTransformType(type)) {
    errors.push({ field: 'type', message: 'Invalid transform type' })
  }

  // Style validation (required)
  if (!style) {
    errors.push({ field: 'style', message: 'Style is required' })
  } else if (!isValidStyleId(style)) {
    errors.push({ field: 'style', message: 'Invalid style ID' })
  }

  // Gender validation (optional)
  if (gender && !isValidGender(gender)) {
    errors.push({ field: 'gender', message: 'Invalid gender value' })
  }

  // Language validation (optional)
  if (language && !isValidLanguage(language)) {
    errors.push({ field: 'language', message: 'Invalid language value' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      photo: photo as string,
      type: type as TransformType,
      style: style as string,
      gender: (gender as Gender) || 'male',
      language: (language as Language) || 'en',
    },
  }
}

export interface GenerateStylesRequestBody {
  photo?: string
  height: string
  weight: string
  gender: Gender
  language: Language
}

export function validateGenerateStylesRequest(body: unknown): ValidationResult<GenerateStylesRequestBody> {
  // Same as analyze request
  return validateAnalyzeRequest(body) as ValidationResult<GenerateStylesRequestBody>
}

export interface HairStylesRequestBody {
  photo: string
  styles: string[]
  gender: Gender
}

export function validateHairStylesRequest(body: unknown): ValidationResult<HairStylesRequestBody> {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
  }

  const { photo, styles, gender } = body as Record<string, unknown>

  // Photo validation (required)
  if (!photo) {
    errors.push({ field: 'photo', message: 'Photo is required' })
  } else if (!isValidPhoto(photo)) {
    errors.push({ field: 'photo', message: 'Invalid photo format or size' })
  }

  // Styles validation (required)
  if (!styles) {
    errors.push({ field: 'styles', message: 'Styles array is required' })
  } else if (!isValidStylesArray(styles)) {
    errors.push({ field: 'styles', message: 'Invalid styles array (1-10 items required)' })
  }

  // Gender validation (optional)
  if (gender && !isValidGender(gender)) {
    errors.push({ field: 'gender', message: 'Invalid gender value' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      photo: photo as string,
      styles: styles as string[],
      gender: (gender as Gender) || 'male',
    },
  }
}

export interface CheckoutRequestBody {
  productId?: string
  successUrl?: string
  isRepeatCustomer?: boolean
  discountCode?: string
}

export function validateCheckoutRequest(body: unknown): ValidationResult<CheckoutRequestBody> {
  if (typeof body !== 'object' || body === null) {
    // Empty body is OK for checkout
    return { valid: true, data: {} }
  }

  const { productId, successUrl, isRepeatCustomer, discountCode } = body as Record<string, unknown>

  const errors: ValidationError[] = []

  // ProductId validation (optional, UUID format)
  if (productId && typeof productId === 'string') {
    if (!/^[a-f0-9-]{36}$/.test(productId)) {
      errors.push({ field: 'productId', message: 'Invalid product ID format' })
    }
  }

  // SuccessUrl validation (optional, must be valid URL)
  if (successUrl && typeof successUrl === 'string') {
    try {
      new URL(successUrl)
    } catch {
      errors.push({ field: 'successUrl', message: 'Invalid success URL' })
    }
  }

  // DiscountCode validation (optional, alphanumeric)
  if (discountCode && typeof discountCode === 'string') {
    if (!/^[A-Z0-9]{3,20}$/.test(discountCode)) {
      errors.push({ field: 'discountCode', message: 'Invalid discount code format' })
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      productId: productId as string | undefined,
      successUrl: successUrl as string | undefined,
      isRepeatCustomer: Boolean(isRepeatCustomer),
      discountCode: discountCode as string | undefined,
    },
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  )
}

/**
 * Validate email format
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  // Simple but effective email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) && value.length <= 254
}

export interface SendReportRequestBody {
  email: string
  report: string
  language: Language
}

export function validateSendReportRequest(body: unknown): ValidationResult<SendReportRequestBody> {
  const errors: ValidationError[] = []

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] }
  }

  const { email, report, language } = body as Record<string, unknown>

  // Email validation (required)
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  // Report validation (required)
  if (!report) {
    errors.push({ field: 'report', message: 'Report content is required' })
  } else if (typeof report !== 'string' || report.length < 10) {
    errors.push({ field: 'report', message: 'Report content is too short' })
  } else if (report.length > 100000) {
    errors.push({ field: 'report', message: 'Report content is too long' })
  }

  // Language validation (optional, defaults to 'en')
  if (language && !isValidLanguage(language)) {
    errors.push({ field: 'language', message: 'Invalid language value' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      email: email as string,
      report: report as string,
      language: (language as Language) || 'en',
    },
  }
}

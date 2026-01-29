import { describe, it, expect } from 'vitest'
import { errorResponse, errors, ErrorCode } from './errors'

const mockCorsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

describe('errorResponse', () => {
  it('creates response with correct status code', async () => {
    const response = errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input',
      400,
      mockCorsHeaders
    )

    expect(response.status).toBe(400)
  })

  it('includes error code and message in body', async () => {
    const response = errorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Something went wrong',
      500,
      mockCorsHeaders
    )

    const body = await response.json()

    expect(body.error).toBe('Something went wrong')
    expect(body.code).toBe('INTERNAL_ERROR')
    expect(body.timestamp).toBeDefined()
  })

  it('includes CORS headers', () => {
    const response = errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Test',
      400,
      mockCorsHeaders
    )

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('includes timestamp in ISO format', async () => {
    const before = new Date().toISOString()
    const response = errorResponse(ErrorCode.INTERNAL_ERROR, 'Test', 500, mockCorsHeaders)
    const body = await response.json()
    const after = new Date().toISOString()

    expect(body.timestamp >= before).toBe(true)
    expect(body.timestamp <= after).toBe(true)
  })
})

describe('errors helper functions', () => {
  describe('validation', () => {
    it('creates 400 validation error', async () => {
      const response = errors.validation('Field required', mockCorsHeaders)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('invalidRequest', () => {
    it('creates 400 invalid request error', async () => {
      const response = errors.invalidRequest('Malformed JSON', mockCorsHeaders)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.code).toBe('INVALID_REQUEST')
    })
  })

  describe('unauthorized', () => {
    it('creates 401 unauthorized error', async () => {
      const response = errors.unauthorized(mockCorsHeaders)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.code).toBe('UNAUTHORIZED')
    })
  })

  describe('forbidden', () => {
    it('creates 403 forbidden error', async () => {
      const response = errors.forbidden(mockCorsHeaders)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('FORBIDDEN')
    })
  })

  describe('notFound', () => {
    it('creates 404 not found error with resource name', async () => {
      const response = errors.notFound('User', mockCorsHeaders)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.code).toBe('NOT_FOUND')
      expect(body.error).toBe('User not found')
    })
  })

  describe('rateLimit', () => {
    it('creates 429 rate limit error', async () => {
      const response = errors.rateLimit(mockCorsHeaders)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.code).toBe('RATE_LIMIT')
    })
  })

  describe('internal', () => {
    it('creates 500 internal error', async () => {
      const response = errors.internal(mockCorsHeaders)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('externalApi', () => {
    it('creates 502 external API error with service name', async () => {
      const response = errors.externalApi('OpenAI', mockCorsHeaders)

      expect(response.status).toBe(502)
      const body = await response.json()
      expect(body.code).toBe('EXTERNAL_API_ERROR')
      expect(body.error).toContain('OpenAI')
    })
  })

  describe('configError', () => {
    it('creates 503 config error', async () => {
      const response = errors.configError(mockCorsHeaders)

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.code).toBe('CONFIG_ERROR')
    })
  })

  describe('serviceUnavailable', () => {
    it('creates 503 service unavailable error', async () => {
      const response = errors.serviceUnavailable(mockCorsHeaders)

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.code).toBe('SERVICE_UNAVAILABLE')
    })
  })
})

describe('ErrorCode enum', () => {
  it('has all expected error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.INVALID_REQUEST).toBe('INVALID_REQUEST')
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.RATE_LIMIT).toBe('RATE_LIMIT')
    expect(ErrorCode.CONFIG_ERROR).toBe('CONFIG_ERROR')
    expect(ErrorCode.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR')
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
  })
})

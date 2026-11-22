import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, getApiErrorMessage, toApiError } from './errors.js'

test('converts the standard API error envelope to a typed error', () => {
  const response = {
    status: 422,
    data: {
      error: {
        code: 'INVALID_UPLOAD',
        message: 'The file is not a supported image',
        details: { accepted_types: ['image/jpeg', 'image/png'] },
      },
    },
  }

  const error = toApiError({ response })

  assert.equal(error instanceof ApiError, true)
  assert.equal(error.name, 'ApiError')
  assert.equal(error.code, 'INVALID_UPLOAD')
  assert.equal(error.status, 422)
  assert.equal(error.message, 'The file is not a supported image')
  assert.deepEqual(error.details, { accepted_types: ['image/jpeg', 'image/png'] })
  assert.equal(error.response, response)
})

test('handles network failures without an HTTP response', () => {
  const error = toApiError(new Error('Network Error'))

  assert.equal(error.code, 'NETWORK_ERROR')
  assert.equal(error.status, null)
  assert.equal(error.message, 'Network Error')
})

test('does not wrap an ApiError more than once', () => {
  const original = new ApiError({ code: 'UNAUTHORIZED', message: 'Sign in required' })

  assert.equal(toApiError(original), original)
})

test('extracts a readable message from the normalized error', () => {
  const error = toApiError({
    response: {
      status: 404,
      data: {
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'The prediction does not exist',
          details: {},
        },
      },
    },
  })

  assert.equal(getApiErrorMessage(error), 'The prediction does not exist')
  assert.equal(getApiErrorMessage(new Error('Other failure')), 'Other failure')
  assert.equal(getApiErrorMessage(null, 'Fallback'), 'Fallback')
})

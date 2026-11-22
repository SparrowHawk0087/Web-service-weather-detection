export class ApiError extends Error {
  constructor({ message, code = 'INTERNAL_ERROR', details = {}, status = null, response = null }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.status = status
    this.response = response
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error

  const response = error?.response
  const envelope = response?.data?.error
  const isEnvelope = envelope && typeof envelope === 'object' && !Array.isArray(envelope)

  return new ApiError({
    message: isEnvelope
      ? envelope.message || 'The request could not be completed'
      : typeof envelope === 'string'
        ? envelope
        : error?.message || 'The server could not be reached',
    code: isEnvelope ? envelope.code || 'INTERNAL_ERROR' : 'NETWORK_ERROR',
    details: isEnvelope && envelope.details && typeof envelope.details === 'object'
      ? envelope.details
      : {},
    status: response?.status ?? null,
    response: response ?? null,
  })
}

export function getApiErrorMessage(error, fallback = 'The request could not be completed') {
  if (error instanceof ApiError) return error.message
  if (typeof error?.message === 'string' && error.message) return error.message

  const envelope = error?.response?.data?.error
  if (typeof envelope === 'string') return envelope
  if (envelope && typeof envelope.message === 'string') return envelope.message

  return fallback
}

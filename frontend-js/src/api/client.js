import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL?.trim() || ''

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

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Token token=${token}`
  } else {
    delete config.headers.Authorization
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)

export default apiClient

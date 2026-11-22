import axios from 'axios'
import { toApiError } from './errors.js'

const API_URL = import.meta.env.VITE_API_URL?.trim() || ''

export { ApiError, getApiErrorMessage, toApiError } from './errors.js'

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

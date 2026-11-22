import apiClient from './client.js'

export async function register(userData) {
  const response = await apiClient.post('/signup', { user: userData })
  return response.data
}

export async function login(email, password) {
  const response = await apiClient.post('/login', { email, password })
  return response.data
}

export async function logout() {
  await apiClient.delete('/logout')
}

export async function getProfile() {
  const response = await apiClient.get('/profile')
  return response.data
}

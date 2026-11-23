import apiClient from './client.js'

export async function getProfile() {
  const response = await apiClient.get('/profile')
  return response.data.user || response.data
}

export async function updateProfile(payload) {
  const response = await apiClient.patch('/profile', { user: payload })
  return response.data.user || response.data
}

export async function updatePassword(payload) {
  const response = await apiClient.patch('/profile/password', payload)
  return response.data
}

export async function getProfileStatistics({ activityPeriod = 'month', activityOffset = 0 } = {}) {
  const response = await apiClient.get('/profile/statistics', {
    params: {
      activity_period: activityPeriod,
      activity_offset: activityOffset,
    },
  })
  return response.data
}

export async function clearPredictionHistory() {
  const response = await apiClient.delete('/predictions/clear')
  return response.data
}

export async function deleteProfile(payload) {
  await apiClient.delete('/profile', { data: payload })
}

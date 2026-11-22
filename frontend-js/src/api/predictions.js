import apiClient from './client.js'

export async function enqueuePrediction(file, modelId = 'vision-v1', name = '') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model_id', modelId)
  if (name) formData.append('name', name)

  const response = await apiClient.post('/predictions/async', formData)
  return response.data
}

export async function getPredictions({ page = 1, perPage = 20 } = {}) {
  const response = await apiClient.get('/predictions', {
    params: { page, per_page: perPage },
  })
  return response.data
}

export async function getPrediction(id) {
  const response = await apiClient.get(`/predictions/${id}`)
  return response.data.prediction
}

export async function analyzePrediction(file, modelId = 'vision-v1') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model_id', modelId)

  const response = await apiClient.post('/predictions/analyze', formData)
  return response.data
}

export async function deletePrediction(id) {
  await apiClient.delete(`/predictions/${id}`)
}

export async function renamePrediction(id, name) {
  const response = await apiClient.patch(`/predictions/${id}`, { name })
  return response.data
}

import apiClient from './client.js'

export async function enqueuePrediction(file, modelId = 'vision-v1', name = '') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model_id', modelId)
  if (name) formData.append('name', name)

  const response = await apiClient.post('/predictions/async', formData)
  return response.data
}

export async function getPredictions({
  page = 1, perPage = 20, q, status, weatherCode, favorite,
  lowConfidence, minConfidence, sort, direction,
} = {}) {
  const params = { page, per_page: perPage }
  if (q) params.q = q
  if (status) params.status = status
  if (weatherCode) params.weather_code = weatherCode
  if (typeof favorite === 'boolean') params.favorite = favorite
  if (typeof lowConfidence === 'boolean') params.low_confidence = lowConfidence
  if (typeof minConfidence === 'number') params.min_confidence = minConfidence
  if (sort) params.sort = sort
  if (direction) params.direction = direction

  const response = await apiClient.get('/predictions', { params })
  return response.data
}

export async function getPrediction(id) {
  const response = await apiClient.get('/predictions/' + id)
  return response.data.prediction
}

export async function addPredictionFavorite(id) {
  const response = await apiClient.put('/predictions/' + id + '/favorite')
  return response.data
}

export async function removePredictionFavorite(id) {
  const response = await apiClient.delete('/predictions/' + id + '/favorite')
  return response.data
}

export async function analyzePrediction(file, modelId = 'vision-v1') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model_id', modelId)

  const response = await apiClient.post('/predictions/analyze', formData)
  return response.data
}

export async function deletePrediction(id) {
  await apiClient.delete('/predictions/' + id)
}

export async function bulkDeletePredictions(ids) {
  const response = await apiClient.delete('/predictions/bulk', { data: { ids } })
  return response.data
}

export async function renamePrediction(id, name) {
  const response = await apiClient.patch('/predictions/' + id, { name })
  return response.data
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './client.js'
import { bulkDeletePredictions, getPredictions } from './predictions.js'

vi.mock('./client.js', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('prediction history API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes the server-side history search, filter, sort, and pagination contract', async () => {
    apiClient.get.mockResolvedValue({ data: { predictions: [], pagination: {} } })

    await getPredictions({
      page: 2,
      perPage: 20,
      q: 'highway-frame',
      status: 'pending,processing',
      weatherCode: 'RAIN',
      favorite: true,
      lowConfidence: true,
      minConfidence: 0.75,
      sort: 'confidence',
      direction: 'asc',
    })

    expect(apiClient.get).toHaveBeenCalledWith('/predictions', {
      params: {
        page: 2,
        per_page: 20,
        q: 'highway-frame',
        status: 'pending,processing',
        weather_code: 'RAIN',
        favorite: true,
        low_confidence: true,
        min_confidence: 0.75,
        sort: 'confidence',
        direction: 'asc',
      },
    })
  })

  it('does not send empty search or unset filter values', async () => {
    apiClient.get.mockResolvedValue({ data: { predictions: [], pagination: {} } })

    await getPredictions({ page: 1, perPage: 20, q: '', favorite: undefined })

    expect(apiClient.get).toHaveBeenCalledWith('/predictions', {
      params: { page: 1, per_page: 20 },
    })
  })

  it('sends a single bulk-delete request with the selected IDs', async () => {
    apiClient.delete.mockResolvedValue({ data: { deleted_count: 2 } })

    await bulkDeletePredictions([12, 14])

    expect(apiClient.delete).toHaveBeenCalledWith('/predictions/bulk', {
      data: { ids: [12, 14] },
    })
  })
})

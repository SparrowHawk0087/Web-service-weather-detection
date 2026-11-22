import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getPredictionStatusLabel,
  isIncomingPredictionNewer,
  isPredictionRecord,
  isPredictionUpdate,
  mergePredictionHistory,
  upsertPrediction,
} from './prediction.js'

function prediction(overrides = {}) {
  return {
    id: 42,
    public_id: 'public-42',
    name: 'Road image',
    status: 'completed',
    weather_code: 'SNOW',
    weather_condition: 'Снег',
    confidence: 0.92,
    probabilities: { SNOW: 0.92, RAIN: 0.05, FOG: 0.03 },
    image_url: '/predictions/42/image',
    image_content_type: 'image/jpeg',
    ml_model_version: 'vision-v1',
    ml_service_version: 'mock-v1',
    original_filename: 'road.jpg',
    processing_duration_ms: 120,
    error_code: null,
    created_at: '2026-11-22T10:00:00.000Z',
    updated_at: '2026-11-22T10:00:01.000Z',
    ...overrides,
  }
}

test('accepts each documented Prediction status, including failed', () => {
  for (const status of ['pending', 'processing', 'completed', 'failed', 'cancelled']) {
    assert.equal(isPredictionRecord(prediction({ status })), true)
  }
})

test('rejects a missing or malformed prediction object', () => {
  assert.equal(isPredictionRecord(null), false)
  assert.equal(isPredictionRecord({ ...prediction(), id: '42' }), false)
  assert.equal(isPredictionRecord({ ...prediction(), status: 'unknown' }), false)
  assert.equal(isPredictionRecord({ ...prediction(), probabilities: [] }), false)
  assert.equal(isPredictionRecord({ ...prediction(), image_url: undefined }), false)
})

test('keeps unknown weather codes as valid server-owned values', () => {
  const unknownCodePrediction = prediction({
    weather_code: 'HAIL',
    weather_condition: 'HAIL',
    probabilities: { HAIL: 0.9, RAIN: 0.1 },
  })

  assert.equal(isPredictionRecord(unknownCodePrediction), true)
})

test('accepts only the canonical prediction.updated event envelope', () => {
  const record = prediction()

  assert.equal(isPredictionUpdate({ type: 'prediction.updated', prediction: record }), true)
  assert.equal(isPredictionUpdate({ type: 'prediction.updated', prediction: { id: 42 } }), false)
  assert.equal(isPredictionUpdate({ type: 'prediction.deleted', prediction: record }), false)
  assert.equal(isPredictionUpdate(null), false)
})

test('upsert replaces the complete record rather than merging old fields', () => {
  const existing = prediction({ old_frontend_field: 'must disappear' })
  const incoming = prediction({
    updated_at: '2026-11-22T10:00:05.000Z',
    status: 'processing',
    confidence: null,
    probabilities: {},
  })

  const result = upsertPrediction([existing], incoming)

  assert.equal(result.length, 1)
  assert.equal(result[0], incoming)
  assert.equal(Object.hasOwn(result[0], 'old_frontend_field'), false)
})

test('upsert ignores stale WebSocket events', () => {
  const existing = prediction({
    status: 'completed',
    updated_at: '2026-11-22T10:00:10.000Z',
  })
  const stale = prediction({
    status: 'processing',
    updated_at: '2026-11-22T10:00:02.000Z',
  })

  assert.deepEqual(upsertPrediction([existing], stale), [existing])
})

test('merges REST snapshots with realtime records by selecting one complete newest record', () => {
  const currentOnly = prediction({ id: 7, created_at: '2026-11-22T09:00:00.000Z' })
  const existing = prediction({ id: 42, status: 'processing' })
  const refreshed = prediction({
    id: 42,
    status: 'completed',
    updated_at: '2026-11-22T10:00:10.000Z',
  })

  const result = mergePredictionHistory(
    [currentOnly, existing],
    [refreshed],
  )

  assert.deepEqual(result.map((item) => item.id), [42, 7])
  assert.equal(result[0], refreshed)
  assert.equal(result[1], currentOnly)
})

test('orders newly inserted predictions by creation time and respects the history limit', () => {
  const older = prediction({ id: 1, created_at: '2026-11-20T10:00:00.000Z' })
  const newer = prediction({ id: 2, created_at: '2026-11-22T10:00:00.000Z' })

  assert.deepEqual(upsertPrediction([older], newer, 1), [newer])
})

test('returns a readable fallback for an unknown status', () => {
  assert.equal(getPredictionStatusLabel('unknown'), 'Неизвестный статус')
  assert.equal(getPredictionStatusLabel('failed'), 'Не удалось выполнить анализ')
})

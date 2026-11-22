export const PREDICTION_STATUSES = Object.freeze([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
])

const STATUS_RANK = Object.freeze({
  pending: 0,
  processing: 1,
  completed: 2,
  failed: 2,
  cancelled: 2,
})

const STATUS_LABELS = Object.freeze({
  pending: 'В очереди',
  processing: 'Обработка изображения',
  completed: 'Завершено',
  failed: 'Не удалось выполнить анализ',
  cancelled: 'Анализ отменён',
})

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isPredictionRecord(value) {
  if (!isPlainObject(value)) return false
  if (!Number.isSafeInteger(value.id) || value.id <= 0) return false
  if (!PREDICTION_STATUSES.includes(value.status)) return false
  if (!isPlainObject(value.probabilities)) return false

  return (
    Object.hasOwn(value, 'weather_code')
    && Object.hasOwn(value, 'weather_condition')
    && Object.hasOwn(value, 'confidence')
    && Object.hasOwn(value, 'image_url')
    && Object.hasOwn(value, 'image_content_type')
    && Object.hasOwn(value, 'created_at')
    && Object.hasOwn(value, 'updated_at')
  )
}

export function isPredictionUpdate(message) {
  return (
    isPlainObject(message)
    && message.type === 'prediction.updated'
    && isPredictionRecord(message.prediction)
  )
}

export function getPredictionStatusLabel(status) {
  return STATUS_LABELS[status] || 'Неизвестный статус'
}

export function isIncomingPredictionNewer(existing, incoming) {
  if (!existing) return true
  if (!incoming) return false

  const existingTime = Date.parse(existing.updated_at || '')
  const incomingTime = Date.parse(incoming.updated_at || '')

  if (Number.isFinite(existingTime) && Number.isFinite(incomingTime)) {
    return incomingTime >= existingTime
  }

  return (STATUS_RANK[incoming.status] ?? -1) >= (STATUS_RANK[existing.status] ?? -1)
}

function newestFirst(predictions) {
  return [...predictions].sort((left, right) => {
    const leftTime = Date.parse(left.created_at || '')
    const rightTime = Date.parse(right.created_at || '')

    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return 0
    return rightTime - leftTime
  })
}

/**
 * Stores the server-provided Prediction as-is. It never fills missing fields
 * by combining two potentially different versions of the API object.
 */
export function upsertPrediction(history, incoming, limit = 20) {
  if (!isPredictionRecord(incoming)) return history

  const index = history.findIndex((item) => item.id === incoming.id)
  if (index >= 0 && !isIncomingPredictionNewer(history[index], incoming)) {
    return history
  }

  const next = [...history]
  if (index >= 0) {
    next[index] = incoming
  } else {
    next.push(incoming)
  }

  return newestFirst(next).slice(0, limit)
}

/**
 * Merges a REST history snapshot with realtime updates by selecting one whole
 * canonical record per id. Current records omitted from a paginated snapshot
 * are retained, since they may have arrived over ActionCable during the fetch.
 */
export function mergePredictionHistory(current, incomingItems, limit = 20) {
  const currentById = new Map(current.map((item) => [item.id, item]))
  const incomingIds = new Set()
  const merged = []

  for (const incoming of incomingItems) {
    if (!isPredictionRecord(incoming)) continue

    incomingIds.add(incoming.id)
    const existing = currentById.get(incoming.id)

    merged.push(
      existing && !isIncomingPredictionNewer(existing, incoming)
        ? existing
        : incoming,
    )
  }

  for (const existing of current) {
    if (!incomingIds.has(existing.id)) merged.push(existing)
  }

  return newestFirst(merged).slice(0, limit)
}

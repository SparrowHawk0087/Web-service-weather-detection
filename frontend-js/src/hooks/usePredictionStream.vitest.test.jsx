import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsumer } from '@rails/actioncable'
import { usePredictionStream, buildCableUrl } from './usePredictionStream.js'

vi.mock('../context/useAuth.js', () => ({
  useAuth: () => ({ token: 'session-token' }),
}))

vi.mock('@rails/actioncable', () => ({
  createConsumer: vi.fn(),
}))

function prediction(overrides = {}) {
  return {
    id: 101,
    public_id: 'prediction-101',
    name: 'Road scene',
    status: 'completed',
    weather_code: 'SNOW',
    weather_condition: 'Снег',
    confidence: 0.92,
    probabilities: { SNOW: 0.92, RAIN: 0.05, FOG: 0.03 },
    image_url: '/predictions/101/image',
    image_content_type: 'image/jpeg',
    ml_model_version: 'vision-v1',
    ml_service_version: 'mock-v1',
    original_filename: 'road.jpg',
    processing_duration_ms: 100,
    error_code: null,
    created_at: '2026-11-22T10:00:00.000Z',
    updated_at: '2026-11-22T10:00:01.000Z',
    ...overrides,
  }
}

describe('usePredictionStream', () => {
  let handlers
  let subscription
  let consumer

  beforeEach(() => {
    handlers = null
    subscription = { unsubscribe: vi.fn() }
    consumer = {
      subscriptions: {
        create: vi.fn((_identifier, callbacks) => {
          handlers = callbacks
          return subscription
        }),
      },
      disconnect: vi.fn(),
    }
    createConsumer.mockReturnValue(consumer)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('builds a secure WebSocket URL and includes the token', () => {
    const url = new URL(buildCableUrl('secret-token', 'https://weather.example'))

    expect(url.protocol).toBe('wss:')
    expect(url.pathname).toBe('/cable')
    expect(url.searchParams.get('token')).toBe('secret-token')
  })

  it('delivers only valid prediction.updated events', () => {
    const onUpdate = vi.fn()
    const onConnected = vi.fn()

    renderHook(() => usePredictionStream(onUpdate, onConnected))

    expect(createConsumer).toHaveBeenCalledTimes(1)
    expect(consumer.subscriptions.create).toHaveBeenCalledWith(
      { channel: 'PredictionsChannel' },
      expect.any(Object),
    )

    act(() => handlers.connected())
    expect(onConnected).toHaveBeenCalledTimes(1)

    const validPrediction = prediction()
    act(() => handlers.received({
      type: 'prediction.updated',
      prediction: validPrediction,
    }))
    expect(onUpdate).toHaveBeenCalledWith(validPrediction)

    act(() => handlers.received({
      type: 'prediction.updated',
      prediction: { id: 101, status: 'completed' },
    }))
    act(() => handlers.received({
      type: 'prediction.deleted',
      prediction: validPrediction,
    }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes and disconnects when the hook unmounts', () => {
    const { unmount } = renderHook(() => usePredictionStream(vi.fn()))

    unmount()

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
    expect(consumer.disconnect).toHaveBeenCalledTimes(1)
  })
})

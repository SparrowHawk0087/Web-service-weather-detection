import { createConsumer } from '@rails/actioncable'
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { isPredictionUpdate } from '../domain/prediction'

const API_URL = import.meta.env.VITE_API_URL?.trim() || ''

export function buildCableUrl(token, origin = window.location.origin) {
  const url = new URL('/cable', API_URL || origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('token', token)
  return url.toString()
}

export function usePredictionStream(onUpdate, onConnected) {
  const { token } = useAuth()
  const onUpdateRef = useRef(onUpdate)
  const onConnectedRef = useRef(onConnected)

  useEffect(() => {
    onUpdateRef.current = onUpdate
    onConnectedRef.current = onConnected
  }, [onUpdate, onConnected])

  useEffect(() => {
    if (!token) return undefined

    const consumer = createConsumer(buildCableUrl(token))
    const subscription = consumer.subscriptions.create(
      { channel: 'PredictionsChannel' },
      {
        connected() {
          onConnectedRef.current?.()
        },
        received(message) {
          if (isPredictionUpdate(message)) {
            onUpdateRef.current?.(message.prediction)
          }
        },
        rejected() {
          console.warn('Prediction WebSocket subscription was rejected')
        },
      },
    )

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
  }, [token])
}

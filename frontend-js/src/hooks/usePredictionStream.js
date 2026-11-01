import { createConsumer } from '@rails/actioncable'
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function buildCableUrl(token) {
  const url = new URL('/cable', API_URL)
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
          if (message?.type === 'prediction.updated' && message.prediction) {
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

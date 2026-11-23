import { useEffect, useState } from 'react'
import apiClient from '../api/client'

export function usePredictionImage(imageUrl) {
  const [objectUrl, setObjectUrl] = useState(null)

  useEffect(() => {
    if (!imageUrl) {
      setObjectUrl(null)
      return undefined
    }

    const controller = new AbortController()
    let active = true
    let createdUrl = null

    setObjectUrl(null)

    apiClient.get(imageUrl, {
      responseType: 'blob',
      signal: controller.signal,
    }).then(({ data }) => {
      if (!active || !data?.type?.startsWith('image/')) return

      createdUrl = URL.createObjectURL(data)
      setObjectUrl(createdUrl)
    }).catch((error) => {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        // A missing or expired image should fall back to the visual placeholder.
      }
    })

    return () => {
      active = false
      controller.abort()
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [imageUrl])

  return objectUrl
}

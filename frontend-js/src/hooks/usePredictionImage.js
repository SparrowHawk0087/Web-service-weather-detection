import { useEffect, useState } from 'react'
import apiClient from '../api/client'

export function usePredictionImage(imageUrl) {
  const [loadedImage, setLoadedImage] = useState({
    source: null,
    objectUrl: null,
  })

  useEffect(() => {
    if (!imageUrl) return undefined

    const controller = new AbortController()
    let active = true
    let createdUrl = null

    apiClient.get(imageUrl, {
      responseType: 'blob',
      signal: controller.signal,
    }).then(({ data }) => {
      if (!active || !data?.type?.startsWith('image/')) return

      createdUrl = URL.createObjectURL(data)
      setLoadedImage({
        source: imageUrl,
        objectUrl: createdUrl,
      })
    }).catch(() => {
      // Missing/deleted images use the visual placeholder.
    })

    return () => {
      active = false
      controller.abort()
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [imageUrl])

  // Do not show the previous record's thumbnail while a new image is loading.
  return loadedImage.source === imageUrl ? loadedImage.objectUrl : null
}

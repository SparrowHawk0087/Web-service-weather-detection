import { useEffect, useState } from 'react'

export function useObjectUrl(file, enabled = true) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!enabled || !file || !file.type?.startsWith('image/')) return undefined

    const url = URL.createObjectURL(file)
    const frameId = window.requestAnimationFrame(() => setPreview({ file, url }))

    return () => {
      window.cancelAnimationFrame(frameId)
      URL.revokeObjectURL(url)
    }
  }, [file, enabled])

  return preview?.file === file ? preview.url : null
}

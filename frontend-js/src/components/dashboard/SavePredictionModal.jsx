import { useEffect, useRef, useState } from 'react'

export default function SavePredictionModal({ isOpen, onClose, file, prediction, onSave }) {
  const [name, setName] = useState('')
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setName('')
    setError(null)
    setSubmitting(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [isOpen, file])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !prediction) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Введите название')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSave(trimmed)
      onClose()
    } catch (err) {
      console.error('Save prediction error:', err)
      setError(err.response?.data?.error || 'Не удалось сохранить')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const weatherLabel =
    prediction.weather_condition ?? prediction.label ?? prediction.class ?? '—'
  const confidencePct =
    typeof prediction.confidence === 'number'
      ? (prediction.confidence * 100).toFixed(1)
      : '—'

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-purple-400/40 bg-[#12131b] p-6 shadow-[0_0_60px_rgba(168,85,247,0.4)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-2xl font-semibold text-white text-center mb-6">Save Result</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} alt="upload" className="w-full h-full object-contain" />
            ) : (
              <span className="text-white/40 text-sm">No preview</span>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Prediction</p>
              <p className="text-white font-semibold">{weatherLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs uppercase tracking-wider">Confidence</p>
              <p className="text-white font-semibold">{confidencePct}%</p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название записи"
            maxLength={80}
            className="w-full rounded-2xl bg-white/5 border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
          />

          {error && (
            <div className="rounded-xl bg-red-500/20 border border-red-400/40 p-3">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Saving...' : 'Save to history'}
          </button>
        </form>
      </div>
    </div>
  )
}
import { useRef, useState, useEffect } from 'react'
import ModelAccordion from './ModelAccordion'

export default function DropZone({
  file,
  onChange,
  modelId,
  onModelChange,
  onAnalyze,
  onReportIssue,
  loading = false,
  prediction = null,
  error = null,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleClick = () => {
    if (loading) return
    inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const picked = e.target.files?.[0]
    if (picked) onChange(picked)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onChange(dropped)
  }

  const clearFile = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  // Определяем цвет для бейджа погоды
  const getWeatherColor = (code) => {
    const colors = {
      'RAIN': 'from-blue-500 to-cyan-500',
      'SNOW': 'from-cyan-400 to-blue-300',
      'FOG': 'from-gray-400 to-slate-500',
    }
    return colors[code] || 'from-purple-500 to-fuchsia-500'
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-3">
      {/* main drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full h-[420px] rounded-3xl
          border-2 border-dashed
          flex flex-col items-center justify-center
          transition-all overflow-hidden
          ${loading ? 'cursor-wait' : 'cursor-pointer'}
          ${
            isDragging
              ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
              : 'border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/zip,application/x-zip-compressed"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* СОСТОЯНИЕ ЗАГРУЗКИ */}
        {loading && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
            <p className="text-white text-sm font-medium">
              Анализируем изображение...
            </p>
          </div>
        )}

        {file ? (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-4 relative">
            {/* Если картинка - показываем превью, если архив - иконку файла */}
            {preview && file.type.startsWith('image/') ? (
              <img
                src={preview}
                alt={file.name}
                className="max-h-[260px] max-w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                </svg>
              </div>
            )}

            <div className="text-center">
              <div className="text-white text-sm font-medium truncate max-w-xs">
                {file.name}
              </div>
              <div className="text-white/40 text-xs mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            {/* КНОПКА ЗАПУСКА АНАЛИЗА */}
            {!prediction && !loading && !error && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Чтобы не открывался диалог выбора файла
                  onAnalyze();
                }}
                className="mt-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                Start Analysis
              </button>
            )}

            {/* РЕЗУЛЬТАТ ПРЕДСКАЗАНИЯ */}
            {prediction && !loading && (
              <div className={`absolute bottom-6 left-6 right-6 rounded-2xl bg-gradient-to-r ${getWeatherColor(prediction.weather_code)} p-4 shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
                      Результат
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {prediction.weather_condition}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
                      Уверенность
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ОШИБКА */}
            {error && !loading && (
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-red-500/20 border border-red-400/40 p-4">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Кнопка удаления */}
            {!loading && (
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
                aria-label="Remove"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center px-6 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm">Drag & drop photo here</p>
              <p className="text-white/40 text-xs mt-1">or click to browse</p>
            </div>
            <p className="text-white/30 text-xs">png, jpeg, jpg, zip</p>
          </div>
        )}
      </div>

      {/* bottom block: accordion + Model was wrong */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ModelAccordion
            value={modelId}
            onChange={onModelChange}
            disabled={!file || loading || !!prediction} // Блокируем смену модели, если уже есть результат
          />
        </div>

        <button
          type="button"
          onClick={onReportIssue}
          disabled={!file || loading || !prediction}
          className="shrink-0 px-5 py-3 rounded-2xl bg-white/5 border border-white/15 text-white/80 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Model was wrong?
        </button>
      </div>
    </div>
  )
}
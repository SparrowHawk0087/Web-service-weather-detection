import { useRef, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import ModelAccordion from './ModelAccordion'

// Словарь с рекомендациями для водителей
const RECOMMENDATIONS = {
  RAIN: [
    'Снизьте скорость и увеличьте дистанцию',
    'Включите ближний свет фар',
    'Остерегайтесь аквапланирования',
  ],
  SNOW: [
    'Избегайте резких торможений и поворотов',
    'Увеличьте дистанцию в 2-3 раза',
    'Проверьте работу стеклоочистителей',
  ],
  FOG: [
    'Используйте противотуманные фары',
    'Снизьте скорость до безопасной',
    'Не используйте дальний свет',
  ],
  DEFAULT: [
    'Соблюдайте ПДД и скоростной режим',
    'Будьте внимательны на дороге',
  ],
}

// Иконки для каждого типа погоды (можно заменить на SVG, если нужно)
const WEATHER_EMOJI = {
  RAIN: '🌧️',
  SNOW: '❄️',
  FOG: '🌫️',
}

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
    if (loading || prediction) return
    inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const picked = e.target.files?.[0]
    if (picked) onChange(picked)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (loading || prediction) return
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (loading || prediction) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onChange(dropped)
  }

  const clearFile = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  const CHART_COLORS = {
    'RAIN': '#3b82f6', // blue-500
    'SNOW': '#22d3ee', // cyan-400
    'FOG': '#9ca3af',  // gray-400
  }

  const chartData = prediction?.probabilities
    ? Object.entries(prediction.probabilities).map(([key, value]) => ({
        name: key.toUpperCase(),
        value: value,
      })).sort((a, b) => b.value - a.value)
    : []

  // Получаем рекомендации для текущей погоды
  const currentTips = prediction 
    ? (RECOMMENDATIONS[prediction.weather_code] || RECOMMENDATIONS.DEFAULT)
    : []

  return (
    <div className="w-full max-w-4xl flex flex-col gap-3">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full min-h-[420px] rounded-3xl
          border-2 border-dashed
          flex flex-col items-center justify-center
          transition-all overflow-hidden
          ${loading ? 'cursor-wait' : prediction ? 'cursor-default' : 'cursor-pointer'}
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

        {loading && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
            <p className="text-white text-sm font-medium">
              Анализируем изображение...
            </p>
          </div>
        )}

        {file ? (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center relative">
            {!loading && (
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
                aria-label="Remove"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {prediction ? (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-between gap-8 pt-4">
                
                {/* Левая колонка: Фото */}
                <div className="flex-1 w-full flex flex-col items-center justify-center min-w-0">
                  {preview && file.type.startsWith('image/') ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="max-h-[320px] max-w-full rounded-2xl object-contain shadow-2xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                      </svg>
                    </div>
                  )}
                  <div className="text-center mt-4">
                    <div className="text-white text-sm font-medium truncate max-w-[250px]">
                      {file.name}
                    </div>
                    <div className="text-white/40 text-xs mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                {/* Правая колонка: Результат, Диаграмма и Рекомендации */}
                <div 
                  className="w-full md:w-[340px] shrink-0 bg-[#12131b] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center w-full">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                      Вердикт модели
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-3xl">{WEATHER_EMOJI[prediction.weather_code] || '🌤️'}</span>
                      <p className="text-3xl font-bold text-white">
                        {prediction.weather_condition}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-purple-400 mb-6">
                      Уверенность: {(prediction.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Кольцевая диаграмма */}
                  <div className="w-32 h-32 relative mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[entry.name] || '#8884d8'} 
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Легенда */}
                  <div className="w-full space-y-2 mb-6">
                    {chartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: CHART_COLORS[item.name] || '#8884d8' }} 
                          />
                          <span className="text-white/80 text-sm font-medium">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-white/60 text-sm font-mono">
                          {(item.value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Блок с рекомендациями */}
                  <div className="w-full border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                        Рекомендации
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {currentTips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-white/70 flex items-start gap-2 leading-tight">
                          <span className="text-purple-400 mt-0.5 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
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

                {!loading && !error && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnalyze();
                    }}
                    className="mt-4 px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium hover:brightness-110 active:scale-[0.98] transition shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                  >
                    Start Analysis
                  </button>
                )}

                {error && !loading && (
                  <div className="mt-4 rounded-2xl bg-red-500/20 border border-red-400/40 p-4 w-full max-w-md">
                    <p className="text-red-300 text-sm text-center">{error}</p>
                  </div>
                )}
              </div>
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

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ModelAccordion
            value={modelId}
            onChange={onModelChange}
            disabled={!file || loading || !!prediction}
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
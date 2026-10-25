import { useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const RECOMMENDATIONS = {
  RAIN: ['Снизьте скорость и увеличьте дистанцию', 'Включите ближний свет фар', 'Остерегайтесь аквапланирования'],
  SNOW: ['Избегайте резких торможений и поворотов', 'Увеличьте дистанцию в 2-3 раза', 'Проверьте работу стеклоочистителей'],
  FOG: ['Используйте противотуманные фары', 'Снизьте скорость до безопасной', 'Не используйте дальний свет'],
  DEFAULT: ['Соблюдайте ПДД и скоростной режим', 'Будьте внимательны на дороге'],
}

const WEATHER_EMOJI = {
  RAIN: '🌧️',
  SNOW: '❄️',
  FOG: '🌫️',
}

const CHART_COLORS = {
  'RAIN': '#3b82f6',
  'SNOW': '#22d3ee',
  'FOG': '#9ca3af',
}

export default function HistoryDetailsModal({ isOpen, onClose, item }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  // Подготавливаем данные графика (безопасно)
  const chartData = item.probabilities
    ? Object.entries(item.probabilities).map(([key, value]) => ({
        name: key.toUpperCase(),
        value: value,
      })).sort((a, b) => b.value - a.value)
    : []

  // Если название пришло битым (UNKNOWN), берем первый класс из графика
  const topClass = chartData.length > 0 ? chartData[0].name : 'UNKNOWN'
  const displayCondition = (item.weather_condition && item.weather_condition !== 'UNKNOWN') 
    ? item.weather_condition 
    : topClass

  const currentTips = RECOMMENDATIONS[topClass] || RECOMMENDATIONS.DEFAULT

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#12131b] p-6 shadow-[0_0_60px_rgba(168,85,247,0.15)] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition z-10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-white mb-6 truncate pr-8">
          {item.name || 'Без названия'}
        </h2>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Левая часть: Фото */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <div className="w-full aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 overflow-hidden">
              <svg className="w-16 h-16 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-white/40 text-sm px-4 text-center break-all">
                {item.original_filename || 'Файл не сохранен'}
              </span>
            </div>
            <p className="text-white/40 text-xs mt-3">
              {new Date(item.created_at).toLocaleString('ru-RU')}
            </p>
          </div>

          {/* Правая часть: Результат и диаграмма */}
          <div className="w-full md:w-1/2 flex flex-col items-center bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
              Вердикт модели
            </p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl">{WEATHER_EMOJI[topClass] || '🌤️'}</span>
              <p className="text-2xl font-bold text-white">
                {displayCondition}
              </p>
            </div>
            <p className="text-lg font-bold text-purple-400 mb-4">
              {(item.confidence * 100).toFixed(1)}%
            </p>

            {/* Диаграмма (фикс размеров для модалки) */}
            {chartData.length > 0 && (
              <div className="relative mb-4" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Легенда */}
            <div className="w-full space-y-1 mb-4">
              {chartData.map((chartItem) => (
                <div key={chartItem.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[chartItem.name] || '#8884d8' }} />
                    <span className="text-white/70">{chartItem.name}</span>
                  </div>
                  <span className="text-white/50 font-mono">{(chartItem.value * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>

            <div className="w-full flex items-center justify-between pt-3 border-t border-white/10 text-xs">
              <span className="text-white/40">Модель:</span>
              <span className="text-white/80 font-medium">{item.ml_model_version || 'Unknown'}</span>
            </div>
          </div>
        </div>
        
        {/* Рекомендации */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Рекомендации
            </span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
  )
}
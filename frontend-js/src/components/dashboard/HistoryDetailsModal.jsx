import { useEffect, useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { getPredictionStatusLabel } from '../../domain/prediction'
import { usePredictionImage } from '../../hooks/usePredictionImage'

const WEATHER = {
  RAIN: { icon: '🌧️', color: '#3b82f6' },
  SNOW: { icon: '❄️', color: '#22d3ee' },
  FOG: { icon: '🌫️', color: '#94a3b8' },
  CLEAR: { icon: '☀️', color: '#f59e0b' },
}

const PROBABILITY_COLORS = {
  RAIN: '#3b82f6',
  SNOW: '#22d3ee',
  FOG: '#94a3b8',
  CLEAR: '#f59e0b',
}

function formatDate(value) {
  if (!value) return 'Не указано'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Не указано'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(value) {
  if (!Number.isFinite(Number(value)) || value === null) return 'Не указано'
  const milliseconds = Number(value)
  if (milliseconds < 1000) return milliseconds + ' мс'
  return (milliseconds / 1000).toFixed(2) + ' с'
}

function probabilityColor(code) {
  return PROBABILITY_COLORS[code] || '#a78bfa'
}

export default function HistoryDetailsModal({
  isOpen,
  onClose,
  item,
  onToggleFavorite,
}) {
  const imageUrl = usePredictionImage(isOpen ? item?.image_url : null)

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  const chartData = useMemo(() => {
    if (!item || item.status !== 'completed' || !item.probabilities) return []
    return Object.entries(item.probabilities)
      .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) >= 0)
      .map(([code, value]) => ({ code: code.toUpperCase(), value: Number(value) }))
      .sort((left, right) => right.value - left.value)
  }, [item])

  if (!isOpen || !item) return null

  const isCompleted = item.status === 'completed'
  const weather = WEATHER[item.weather_code] || { icon: '◌', color: 'var(--profile-text-2)' }
  const title = item.name || item.original_filename || 'Без названия'
  const confidence = Number.isFinite(Number(item.confidence))
    ? Number(item.confidence)
    : null

  return (
    <div className="history-details-overlay">
      <button
        type="button"
        className="history-details-scrim"
        onClick={onClose}
        aria-label="Закрыть подробности анализа"
      />
      <aside
        className="history-details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-details-title"
      >
        <header className="history-details-header">
          <div className="history-details-heading-copy">
            <span className="history-section-kicker">Карточка анализа</span>
            <h2 id="history-details-title" title={title}>{title}</h2>
            <span className={'history-status-badge is-' + item.status}>
              {getPredictionStatusLabel(item.status)}
            </span>
          </div>
          <div className="history-details-header-actions">
            <button
              type="button"
              className={'history-details-icon-button' + (item.is_favorite ? ' is-favorite' : '')}
              onClick={() => onToggleFavorite?.(item)}
              aria-label={item.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              title={item.is_favorite ? 'В избранном' : 'Добавить в избранное'}
            >
              {item.is_favorite ? '★' : '☆'}
            </button>
            <button
              type="button"
              className="history-details-icon-button"
              onClick={onClose}
              aria-label="Закрыть подробности"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 6-12 12M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="history-details-content">
          <section className="history-details-image-section">
            <div className="history-details-image">
              {imageUrl ? (
                <img src={imageUrl} alt={item.original_filename || title} />
              ) : (
                <div className="history-details-image-placeholder">
                  <span aria-hidden="true">{weather.icon}</span>
                  <strong>{item.image_url ? 'Предпросмотр недоступен' : 'Изображение не сохранено'}</strong>
                  <span>{item.original_filename || 'Для этой записи нет исходного файла'}</span>
                </div>
              )}
            </div>
            <div className="history-details-fileline">
              <span>Исходный файл</span>
              <strong title={item.original_filename || ''}>{item.original_filename || 'Не указан'}</strong>
            </div>
          </section>

          <section className="history-details-result-card">
            <div className="history-details-section-heading">
              <span>{isCompleted ? 'Вердикт модели' : 'Статус анализа'}</span>
              <span className={'history-details-status-dot is-' + item.status} />
            </div>

            {isCompleted ? (
              <>
                <div className="history-details-verdict">
                  <span className="history-details-weather-icon">{weather.icon}</span>
                  <div>
                    <span className="history-details-eyebrow">Определённое условие</span>
                    <strong>{item.weather_condition || item.weather_code || 'Не определено'}</strong>
                  </div>
                </div>
                <div className="history-details-confidence">
                  <div>
                    <span>Уверенность модели</span>
                    <strong>{confidence === null ? '—' : (confidence * 100).toFixed(1) + '%'}</strong>
                  </div>
                  <div className="history-details-confidence-track">
                    <span style={{ width: confidence === null ? '0%' : (confidence * 100) + '%' }} />
                  </div>
                  {item.low_confidence && (
                    <p className="history-details-warning">Уверенность ниже порога, заданного для этого погодного класса.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="history-details-pending">
                <strong>{getPredictionStatusLabel(item.status)}</strong>
                <p>
                  {item.status === 'failed'
                    ? 'Попробуйте загрузить изображение ещё раз.'
                    : 'Результат классификации появится после завершения обработки.'}
                </p>
                {item.error_code && <span className="history-details-error-code">Код ошибки: {item.error_code}</span>}
              </div>
            )}
          </section>

          {isCompleted && chartData.length > 0 && (
            <section className="history-details-probabilities">
              <div className="history-details-section-heading">
                <span>Распределение вероятностей</span>
                <span>{chartData.length} класса</span>
              </div>
              <div className="history-details-chart-layout">
                <div className="history-details-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="code"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.code} fill={probabilityColor(entry.code)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="history-details-chart-center">
                    <strong>{chartData[0].code}</strong>
                    <span>топ-класс</span>
                  </div>
                </div>
                <div className="history-details-legend">
                  {chartData.map((entry) => (
                    <div className="history-details-legend-row" key={entry.code}>
                      <span className="history-details-legend-dot" style={{ background: probabilityColor(entry.code) }} />
                      <span>{entry.code}</span>
                      <strong>{(entry.value * 100).toFixed(1)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="history-details-metadata">
            <div className="history-details-section-heading"><span>Параметры записи</span></div>
            <div className="history-details-meta-grid">
              <div><span>Дата создания</span><strong>{formatDate(item.created_at)}</strong></div>
              <div><span>Завершено</span><strong>{formatDate(item.finished_at)}</strong></div>
              <div><span>Версия ML-модели</span><strong>{item.ml_model_version || 'Не указана'}</strong></div>
              <div><span>Версия ML-сервиса</span><strong>{item.ml_service_version || 'Не указана'}</strong></div>
              <div><span>Время обработки</span><strong>{formatDuration(item.processing_duration_ms)}</strong></div>
              <div><span>ID записи</span><strong>#{item.id}</strong></div>
            </div>
          </section>

          {isCompleted && (
            <section className="history-details-recommendation">
              <span className="history-section-kicker">Рекомендации</span>
              <p>Используйте классификацию как вспомогательную информацию и сопоставляйте её с фактической дорожной обстановкой.</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  )
}

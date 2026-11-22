const metrics = [
  { key: 'total_analyses', label: 'Всего анализов', detail: 'Все запуски' },
  { key: 'completed', label: 'Завершено', detail: 'Получен результат' },
  { key: 'in_progress', label: 'В обработке', detail: 'Ожидание и обработка' },
  { key: 'failed', label: 'Ошибки', detail: 'Неуспешные запуски' },
]

function MetricCard({ label, value, detail, accent }) {
  return (
    <article className="profile-glass-card profile-metric-card">
      <div className={`profile-metric-accent ${accent}`} />
      <p className="profile-metric-label">{label}</p>
      <p className="profile-metric-value">{value}</p>
      <p className="profile-metric-detail">{detail}</p>
    </article>
  )
}

export default function StatisticsOverview({ summary, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => <div key={metric.key} className="profile-glass-card h-32 animate-pulse bg-white/[0.035]" />)}
        <div className="profile-glass-card col-span-2 h-32 animate-pulse bg-white/[0.035] xl:col-span-4" />
      </div>
    )
  }

  if (!summary) {
    return (
      <section className="profile-glass-card profile-empty-state">
        Статистика пока недоступна. Повторите загрузку, чтобы получить актуальные данные.
      </section>
    )
  }

  const average = summary.avg_confidence == null
    ? '—'
    : `${(Number(summary.avg_confidence) * 100).toFixed(1)}%`

  return (
    <section aria-label="Сводная статистика">
      <div className="profile-section-head profile-overview-head">
        <div>
          <p className="profile-kicker">Bento analytics</p>
          <h2 className="profile-section-title">Обзор активности</h2>
        </div>
        <span className="profile-section-description">Данные из вашей истории анализов</span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={summary[metric.key] ?? 0}
            detail={metric.detail}
            accent={['profile-accent-purple', 'profile-accent-green', 'profile-accent-blue', 'profile-accent-red'][index]}
          />
        ))}
        <article className="profile-glass-card profile-confidence-summary">
          <div>
            <p className="profile-metric-label">Средняя уверенность</p>
            <p className="profile-metric-detail">Среднее confidence завершённых анализов, не точность модели</p>
          </div>
          <p className="profile-metric-value">{average}</p>
        </article>
      </div>
    </section>
  )
}

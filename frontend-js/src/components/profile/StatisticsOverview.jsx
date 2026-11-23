const metrics = [
  { key: 'total_analyses', label: 'Всего анализов' },
  { key: 'completed', label: 'Завершено' },
  { key: 'in_progress', label: 'В обработке' },
  { key: 'failed', label: 'Ошибки' },
]

function MetricCard({ label, value, accent }) {
  return (
    <article className="profile-glass-card profile-metric-card">
      <div className={`profile-metric-accent ${accent}`} />
      <p className="profile-metric-label">{label}</p>
      <p className="profile-metric-value">{value}</p>
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
        Статистика пока недоступна.
      </section>
    )
  }

  const average = summary.avg_confidence == null
    ? '—'
    : `${(Number(summary.avg_confidence) * 100).toFixed(1)}%`

  return (
    <section aria-label="Сводная статистика">
      <div className="profile-section-head profile-overview-head">
        <h2 className="profile-section-title">Обзор активности</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={summary[metric.key] ?? 0}
            accent={['profile-accent-purple', 'profile-accent-green', 'profile-accent-blue', 'profile-accent-red'][index]}
          />
        ))}
        <article className="profile-glass-card profile-confidence-summary">
          <p className="profile-metric-label">Средняя уверенность</p>
          <p className="profile-metric-value">{average}</p>
        </article>
      </div>
    </section>
  )
}

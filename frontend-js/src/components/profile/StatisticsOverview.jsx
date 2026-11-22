const metrics = [
  { key: 'total_analyses', label: 'Всего анализов', detail: 'Все запуски' },
  { key: 'completed', label: 'Завершено', detail: 'Получен результат' },
  { key: 'in_progress', label: 'В обработке', detail: 'Ожидание и обработка' },
  { key: 'failed', label: 'Ошибки', detail: 'Неуспешные запуски' },
]

function MetricCard({ label, value, detail, accent }) {
  return (
    <article className="profile-glass-card min-w-0 p-4 sm:p-5">
      <div className={`mb-4 h-1 w-10 rounded-full ${accent}`} />
      <p className="text-xs font-medium text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] text-white/35">{detail}</p>
    </article>
  )
}

export default function StatisticsOverview({ summary = {}, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => <div key={metric.key} className="profile-glass-card h-32 animate-pulse bg-white/[0.035]" />)}
        <div className="profile-glass-card col-span-2 h-32 animate-pulse bg-white/[0.035] xl:col-span-4" />
      </div>
    )
  }

  const average = summary.avg_confidence == null
    ? '—'
    : `${(Number(summary.avg_confidence) * 100).toFixed(1)}%`

  return (
    <section aria-label="Сводная статистика">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="profile-eyebrow">Overview</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Ваша активность</h2>
        </div>
        <span className="text-[11px] text-white/35">Реальные данные PostgreSQL</span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={summary[metric.key] ?? 0}
            detail={metric.detail}
            accent={['bg-violet-400', 'bg-emerald-400', 'bg-sky-400', 'bg-rose-400'][index]}
          />
        ))}
        <article className="profile-glass-card col-span-2 flex items-center justify-between gap-4 p-4 sm:p-5 xl:col-span-4">
          <div>
            <p className="text-xs font-medium text-white/50">Средняя уверенность</p>
            <p className="mt-1 text-[11px] text-white/35">Среднее confidence завершённых анализов, не точность модели</p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tabular-nums text-white sm:text-3xl">{average}</p>
        </article>
      </div>
    </section>
  )
}

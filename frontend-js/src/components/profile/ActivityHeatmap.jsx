function activityLevel(count, max) {
  if (!count || !max) return 0
  const share = count / max
  if (share <= 0.25) return 1
  if (share <= 0.5) return 2
  if (share <= 0.75) return 3
  return 4
}

const levels = [
  'profile-heat-level-0',
  'profile-heat-level-1',
  'profile-heat-level-2',
  'profile-heat-level-3',
  'profile-heat-level-4',
]

export default function ActivityHeatmap({ data = [], loading = false }) {
  if (loading) return <section className="profile-glass-card profile-chart-card h-[340px] animate-pulse bg-white/[0.035]" />

  const max = data.reduce((current, item) => Math.max(current, Number(item.count || 0)), 0)
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))

  return (
    <section className="profile-glass-card profile-chart-card">
      <div className="profile-heatmap-head">
        <div>
          <p className="profile-kicker">Активность</p>
          <h2 className="profile-section-title">12 недель</h2>
          <p className="profile-section-description">Каждая клетка — один календарный день</p>
        </div>
        <div className="profile-total-chip">
          <p className="profile-total-value">{total}</p>
          <p className="profile-total-label">запусков</p>
        </div>
      </div>

      {data.length ? (
        <>
          <div className="profile-heatmap-grid" role="list" aria-label="Активность за последние 84 дня">
            {data.map((item) => {
              const level = activityLevel(Number(item.count || 0), max)
              return (
                <div
                  key={item.date}
                  role="listitem"
                  aria-label={`${formatDate(item.date)}: ${item.count} запусков`}
                  title={`${formatDate(item.date)} · ${item.count} запусков`}
                  className={`profile-heat-cell ${levels[level]}`}
                />
              )
            })}
          </div>
          <div className="profile-heatmap-legend">
            <span>{data[0] ? formatDate(data[0].date) : ''}</span>
            <div className="profile-heatmap-scale">
              <span>Меньше</span>
              {levels.map((level) => <span key={level} className={`profile-heat-swatch ${level}`} aria-hidden="true" />)}
              <span>Больше</span>
            </div>
            <span>{data.at(-1) ? formatDate(data.at(-1).date) : ''}</span>
          </div>
        </>
      ) : (
        <div className="profile-chart-empty profile-activity-empty">
          Пока нет активности
        </div>
      )}
    </section>
  )
}

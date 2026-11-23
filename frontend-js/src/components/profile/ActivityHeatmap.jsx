const PERIODS = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
]

const MAX_OFFSETS = { week: 104, month: 120, year: 20 }

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

const dateValue = (value) => new Date(`${value}T12:00:00`)
const dateFormat = (value, options) => new Intl.DateTimeFormat('ru-RU', options).format(dateValue(value))

function periodRangeLabel(period, data, range) {
  if (period === 'year' && range?.start_date) {
    return dateFormat(range.start_date, { year: 'numeric' })
  }
  if (period === 'month' && range?.start_date) {
    return dateFormat(range.start_date, { month: 'long', year: 'numeric' })
  }
  if (!range?.start_date || !range?.end_date) return ''

  const start = dateValue(range.start_date)
  const end = dateValue(range.end_date)
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(end)}`
  }
  return `${dateFormat(range.start_date, { day: 'numeric', month: 'short' })} – ${dateFormat(range.end_date, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function monthLabel(date) {
  return dateFormat(date, { month: 'short' }).replace('.', '')
}

export default function ActivityHeatmap({
  data = [],
  range,
  period = 'month',
  offset = 0,
  loading = false,
  refreshing = false,
  onPeriodChange,
  onOffsetChange,
}) {
  if (loading) {
    return <section className="profile-glass-card profile-chart-card h-[340px] animate-pulse bg-white/[0.035]" />
  }

  const max = data.reduce((current, item) => Math.max(current, Number(item.count || 0)), 0)
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const label = refreshing ? 'Обновление…' : periodRangeLabel(period, data, range)
  const maxOffset = MAX_OFFSETS[period] || 120
  const leadingCells = period === 'month' && data[0]
    ? (dateValue(data[0].date).getDay() + 6) % 7
    : 0

  function renderCell(item) {
    const level = activityLevel(Number(item.count || 0), max)
    const date = dateValue(item.date)
    const dayNumber = period === 'year' ? monthLabel(item.date) : date.getDate()
    const title = period === 'year'
      ? `${dateFormat(item.date, { month: 'long', year: 'numeric' })}: ${item.count} анализов`
      : `${dateFormat(item.date, { day: 'numeric', month: 'long', year: 'numeric' })}: ${item.count} анализов`

    return (
      <div
        key={item.date}
        role="listitem"
        aria-label={title}
        title={title}
        className={`profile-activity-cell ${levels[level]}`}
      >
        <span className="profile-activity-day">{dayNumber}</span>
        <span className={`profile-activity-count ${item.count > 0 ? 'has-activity' : 'is-empty'}`}>
          {item.count > 0 ? item.count : '·'}
        </span>
      </div>
    )
  }

  return (
    <section className="profile-glass-card profile-chart-card">
      <div className="profile-heatmap-head">
        <h2 className="profile-section-title">Активность</h2>
        {refreshing && (
          <span className="profile-activity-refresh" role="status">
            <span className="profile-activity-spinner" aria-hidden="true" />
            Обновление
          </span>
        )}
        <div className="profile-total-chip">
          <p className="profile-total-value">{refreshing ? '…' : total}</p>
          <p className="profile-total-label">анализов</p>
        </div>
      </div>

      <div className="profile-activity-toolbar">
        <div className="profile-period-tabs" role="group" aria-label="Период активности">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={period === item.id}
              onClick={() => onPeriodChange(item.id)}
              className={`profile-period-tab ${period === item.id ? 'is-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="profile-period-navigation">
          <button
            type="button"
            aria-label="Предыдущий период"
            title="Предыдущий период"
            onClick={() => onOffsetChange(Math.max(-maxOffset, offset - 1))}
            disabled={offset <= -maxOffset}
            className="profile-period-arrow"
          >
            ‹
          </button>
          <span className="profile-period-label">{label}</span>
          <button
            type="button"
            aria-label="Следующий период"
            title="Следующий период"
            onClick={() => onOffsetChange(Math.min(0, offset + 1))}
            disabled={offset >= 0}
            className="profile-period-arrow"
          >
            ›
          </button>
        </div>
      </div>

      {period !== 'year' && (
        <div className="profile-weekday-row" aria-hidden="true">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}
        </div>
      )}

      {data.length ? (
        <div
          className={`profile-activity-grid ${period === 'year' ? 'is-year' : 'is-calendar'} ${refreshing ? 'is-refreshing' : ''}`}
          role="list"
          aria-label="Количество анализов за выбранный период"
          aria-busy={refreshing}
        >
          {Array.from({ length: leadingCells }, (_, index) => (
            <span key={`empty-${index}`} className="profile-activity-placeholder" aria-hidden="true" />
          ))}
          {data.map(renderCell)}
        </div>
      ) : (
        <div className="profile-chart-empty profile-activity-empty">Нет данных за этот период</div>
      )}

      <div className="profile-heatmap-scale">
        <span>Меньше</span>
        {levels.map((level) => <span key={level} className={`profile-heat-swatch ${level}`} aria-hidden="true" />)}
        <span>Больше</span>
      </div>
    </section>
  )
}

function activityLevel(count, max) {
  if (!count || !max) return 0
  const share = count / max
  if (share <= 0.25) return 1
  if (share <= 0.5) return 2
  if (share <= 0.75) return 3
  return 4
}

const levels = [
  'bg-white/[0.06] border-white/[0.04]',
  'bg-violet-950/80 border-violet-800/40',
  'bg-violet-800/80 border-violet-600/40',
  'bg-violet-600/90 border-violet-400/40',
  'bg-fuchsia-400 border-fuchsia-200/50',
]

export default function ActivityHeatmap({ data = [], loading = false }) {
  if (loading) return <section className="profile-glass-card h-[340px] animate-pulse bg-white/[0.035]" />

  const max = data.reduce((current, item) => Math.max(current, Number(item.count || 0)), 0)
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))

  return (
    <section className="profile-glass-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="profile-eyebrow">Consistency</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Активность · 12 недель</h2>
          <p className="mt-1 text-xs text-white/40">Каждая ячейка — один календарный день</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
          <p className="text-lg font-semibold tabular-nums text-white">{total}</p>
          <p className="text-[10px] text-white/35">запусков</p>
        </div>
      </div>

      {data.length ? (
        <>
          <div className="grid h-[118px] grid-flow-col grid-cols-12 grid-rows-7 gap-1 sm:h-[140px] sm:gap-1.5" role="list" aria-label="Активность за последние 84 дня">
            {data.map((item) => {
              const level = activityLevel(Number(item.count || 0), max)
              return (
                <div
                  key={item.date}
                  role="listitem"
                  aria-label={`${formatDate(item.date)}: ${item.count} запусков`}
                  title={`${formatDate(item.date)} · ${item.count} запусков`}
                  className={`min-h-0 min-w-0 rounded-[4px] border transition-colors ${levels[level]}`}
                />
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-[10px] text-white/35">
            <span>{data[0] ? formatDate(data[0].date) : ''}</span>
            <div className="flex items-center gap-1.5">
              <span>Меньше</span>
              {levels.map((level, index) => <span key={level} className={`h-2.5 w-2.5 rounded-[3px] border ${level}`} aria-hidden="true" />)}
              <span>Больше</span>
            </div>
            <span>{data.at(-1) ? formatDate(data.at(-1).date) : ''}</span>
          </div>
        </>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-white/40">
          Пока нет активности
        </div>
      )}
    </section>
  )
}

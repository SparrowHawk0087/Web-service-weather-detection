import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const WEATHER_COLORS = {
  FOG: '#a5b4fc',
  RAIN: '#38bdf8',
  SNOW: '#c4b5fd',
  CLEAR: '#fbbf24',
  UNKNOWN: '#64748b',
}

export default function WeatherDistribution({ data = [], loading = false }) {
  if (loading) return <section className="profile-glass-card h-[340px] animate-pulse bg-white/[0.035]" />

  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const chartData = data.filter((item) => Number(item.count) > 0)

  return (
    <section className="profile-glass-card min-w-0 p-5 sm:p-6">
      <div className="mb-4">
        <p className="profile-eyebrow">Classification</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Распределение погоды</h2>
        <p className="mt-1 text-xs text-white/40">Только завершённые реальные результаты</p>
      </div>

      <div className="relative mx-auto h-52 w-full max-w-[250px]">
        {total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="66%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.code} fill={WEATHER_COLORS[entry.code] || WEATHER_COLORS.UNKNOWN} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums text-white">{total}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Результатов</span>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-white/15 bg-white/[0.02]">
            <p className="max-w-[150px] text-center text-xs leading-relaxed text-white/40">Пока нет результатов классификации</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.code} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: WEATHER_COLORS[item.code] || WEATHER_COLORS.UNKNOWN }} />
            <span className="min-w-0 flex-1 truncate text-xs text-white/65">{item.label}</span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-white">{item.count}</span>
            <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-white/35">{Number(item.percentage || 0).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const WEATHER_COLORS = {
  FOG: '#94a3b8',
  RAIN: '#3b82f6',
  SNOW: '#0ea5e9',
  CLEAR: '#f59e0b',
  UNKNOWN: '#74839a',
}

export default function WeatherDistribution({ data = [], loading = false }) {
  if (loading) return <section className="profile-glass-card profile-chart-card h-[340px] animate-pulse bg-white/[0.035]" />

  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const chartData = data.filter((item) => Number(item.count) > 0)

  return (
    <section className="profile-glass-card profile-chart-card">
      <div className="profile-section-head">
        <h2 className="profile-section-title">Распределение классов</h2>
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
                  contentStyle={{
                    background: 'var(--profile-overlay)',
                    border: '1px solid var(--profile-line)',
                    borderRadius: 12,
                    color: 'var(--profile-text)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  itemStyle={{ color: 'var(--profile-text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="profile-metric-value">{total}</span>
              <span className="profile-chart-center-label">РЕЗУЛЬТАТОВ</span>
            </div>
          </>
        ) : (
          <div className="profile-chart-empty">
            <p>Пока нет результатов классификации</p>
          </div>
        )}
      </div>

      <div className="profile-distribution-legend">
        {data.map((item) => (
          <div key={item.code} className="profile-legend-row">
            <span className="profile-legend-dot" style={{ backgroundColor: WEATHER_COLORS[item.code] || WEATHER_COLORS.UNKNOWN }} />
            <span className="profile-legend-name">{item.label}</span>
            <span className="profile-legend-value">{item.count}</span>
            <span className="profile-legend-percentage">{Number(item.percentage || 0).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}

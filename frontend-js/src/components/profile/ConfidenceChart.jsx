import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`))
}

function ConfidenceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point || point.avg_confidence == null) return null

  return (
    <div className="profile-chart-tooltip">
      <p className="profile-chart-tooltip-date">{formatDate(point.date)}</p>
      <p className="profile-chart-tooltip-value">{(point.avg_confidence * 100).toFixed(1)}% уверенности</p>
      <p className="profile-chart-tooltip-detail">Анализов: {point.sample_count}</p>
    </div>
  )
}

export default function ConfidenceChart({ activity = [], trend = [], loading = false }) {
  const chartData = useMemo(() => {
    const byDate = new Map(trend.map((point) => [point.date, point]))
    return activity.map((day) => {
      const point = byDate.get(day.date)
      return {
        date: day.date,
        avg_confidence: point?.avg_confidence ?? null,
        sample_count: point?.sample_count ?? 0,
      }
    })
  }, [activity, trend])

  if (loading) return <section className="profile-glass-card profile-chart-card h-[310px] animate-pulse bg-white/[0.035]" />

  const hasResults = trend.some((point) => point.avg_confidence != null)

  return (
    <section className="profile-glass-card profile-chart-card">
      <div className="profile-section-head">
        <h2 className="profile-section-title">Уверенность по времени</h2>
      </div>

      {hasResults ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 2, left: -18 }}>
              <CartesianGrid stroke="var(--profile-grid-line)" vertical={false} strokeDasharray="3 5" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => value.slice(5)}
                tick={{ fill: 'var(--profile-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
                tick={{ fill: 'var(--profile-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<ConfidenceTooltip />} />
              <Line
                type="monotone"
                dataKey="avg_confidence"
                stroke="var(--profile-accent)"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: 'var(--profile-accent)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--profile-text)', stroke: 'var(--profile-accent)', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="profile-chart-empty profile-confidence-empty">
          Недостаточно завершённых анализов для построения графика
        </div>
      )}
    </section>
  )
}

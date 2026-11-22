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
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50">{formatDate(point.date)}</p>
      <p className="mt-1 font-semibold text-white">{(point.avg_confidence * 100).toFixed(1)}% уверенности</p>
      <p className="mt-1 text-white/45">Анализов: {point.sample_count}</p>
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

  if (loading) return <section className="profile-glass-card h-[310px] animate-pulse bg-white/[0.035]" />

  const hasResults = trend.some((point) => point.avg_confidence != null)

  return (
    <section className="profile-glass-card min-w-0 p-5 sm:p-6">
      <div className="mb-4">
        <p className="profile-eyebrow">Model output</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Динамика уверенности</h2>
        <p className="mt-1 text-xs text-white/40">Среднее confidence завершённых анализов за день · 84 дня</p>
      </div>

      {hasResults ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 2, left: -18 }}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} strokeDasharray="3 5" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => value.slice(5)}
                tick={{ fill: 'rgba(255,255,255,.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
                tick={{ fill: 'rgba(255,255,255,.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<ConfidenceTooltip />} />
              <Line
                type="monotone"
                dataKey="avg_confidence"
                stroke="#c4b5fd"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#e9d5ff', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#fff', stroke: '#a78bfa', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 px-5 text-center text-sm text-white/40">
          Недостаточно завершённых анализов для построения графика
        </div>
      )}
    </section>
  )
}

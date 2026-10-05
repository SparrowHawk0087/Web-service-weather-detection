import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// colors for piechart
const WEATHER_COLORS = {
  Snow: '#a855f7',
  Rain: '#22d3ee',
  Fog: '#f472b6',
};

// piechart
function PieChart({ segments, size = 220 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-white/15 flex items-center justify-center bg-white/[0.02]"
        style={{ width: size, height: size }}
      >
        <span className="text-white/30 text-xs text-center px-6">
          No data yet
        </span>
      </div>
    )
  }

  let cumulative = 0
  const stops = segments
    .map((seg) => {
      const start = (cumulative / total) * 100
      cumulative += seg.value
      const end = (cumulative / total) * 100
      return `${seg.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${stops})`,
      }}
    />
  )
}

function ProfileCard() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
  })

  const initial = user?.name?.charAt(0).toUpperCase() || '?'

  const isDirty =
    form.name !== (user?.name || '') ||
    form.email !== (user?.email || '') ||
    form.password !== ''

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isDirty) return;
    console.log('>>> save profile:', form)
    // TODO: PATCH /profile
  }

  const handleReset = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
    })
  }

  const handleEraseHistory = () => {
    // TODO: DELETE /analyses
    console.log('>>> erase history')
  }

  const handleDeleteProfile = () => {
    // TODO: DELETE /profile
    console.log('>>> delete profile')
  }

  const inputClass =
    'w-full rounded-xl bg-white/[0.04] border border-white/15 px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition'

  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-sm p-6 flex flex-col">
      <h2 className="text-xl font-semibold text-white text-center mb-6">
        Profile
      </h2>

      <div className="flex items-start gap-4 mb-6">
        {/* avatar */}
        <div className="shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-3xl font-bold">
          {initial}
        </div>

        {/* input forms */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-3">
          <input
            type="text"
            name="name"
            placeholder="Nickname"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            type="password"
            name="password"
            placeholder="New password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!isDirty}
              className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="px-5 py-2.5 rounded-full bg-white/5 border border-white/15 text-white/70 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="mt-auto pt-6 border-t border-white/10 space-y-2">
        <button
          type="button"
          onClick={handleEraseHistory}
          className="w-full py-2.5 rounded-full bg-white/5 border border-white/15 text-white/70 text-sm hover:bg-white/10 transition"
        >
          Erase history from database
        </button>
        <button
          type="button"
          onClick={handleDeleteProfile}
          className="w-full py-2.5 rounded-full bg-red-500/10 border border-red-400/30 text-red-300 text-sm hover:bg-red-500/20 transition"
        >
          Delete profile
        </button>
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

function StatsCard() {
  // test data
  const stats = {
    photosAnalyzed: 0,
    avgModelResult: 0,
    savedAnalyses: 0,
    errorRate: 0,
  }

  const segments = [
    { label: 'Snow', value: 0, color: WEATHER_COLORS.Snow },
    { label: 'Rain', value: 0, color: WEATHER_COLORS.Rain },
    { label: 'Fog', value: 0, color: WEATHER_COLORS.Fog },
  ]

  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-sm p-6 flex flex-col">
      <h2 className="text-xl font-semibold text-white text-center mb-6">
        Statistics
      </h2>

      <div className="flex justify-center mb-6">
        <PieChart segments={segments} size={220} />
      </div>

      {/* legend */}
      <div className="space-y-2 mb-6 max-w-[220px] mx-auto w-full">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3">
            <div
              className="h-3 flex-1 rounded-full transition"
              style={{
                backgroundColor: seg.color,
                opacity: total > 0 ? 1 : 0.25,
              }}
            />
            <span className="text-white/70 text-sm w-12">{seg.label}</span>
          </div>
        ))}
      </div>

      {/* numbers */}
      <div className="mt-auto pt-6 border-t border-white/10 space-y-2">
        <StatRow label="Photos analyzed" value={stats.photosAnalyzed} />
        <StatRow
          label="Avg. model result"
          value={stats.avgModelResult.toFixed(1)}
        />
        <StatRow label="Saved analyses" value={stats.savedAnalyses} />
        <StatRow label="Error rate" value={stats.errorRate.toFixed(1)} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  }

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              135deg,
              #1e3a5f 0%,
              #16273f 25%,
              #0f1828 55%,
              #0a0d18 80%,
              #06080f 100%
            )
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      {/* content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 text-white">

        {/* top line: back and logout */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to dashboard
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-white/70 hover:text-white transition"
          >
            Logout →
          </button>
        </div>

        {/* grid of 2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-2">
            <ProfileCard />
          </div>
          <div className="md:col-span-3">
            <StatsCard />
          </div>
        </div>
      </div>
    </div>
  )
}
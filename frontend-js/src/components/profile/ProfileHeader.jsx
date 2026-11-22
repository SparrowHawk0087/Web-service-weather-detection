import { Link } from 'react-router-dom'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function ProfileHeader({ user, onLogout }) {
  const initial = user?.name?.trim()?.charAt(0)?.toLocaleUpperCase() || '?'

  return (
    <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-300"
          >
            <span aria-hidden="true">←</span>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full px-3 py-2 text-sm text-white/55 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-300"
          >
            Выйти
          </button>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/70">
          Account space
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Профиль и статистика
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Управляйте учётной записью и просматривайте историю использования FSR-WEATHER.
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl sm:max-w-xs">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-semibold text-white shadow-lg shadow-violet-950/40">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.name || 'Пользователь'}</p>
          <p className="truncate text-xs text-white/50">{user?.email || '—'}</p>
          <p className="mt-1 text-[11px] text-white/35">С нами с {formatDate(user?.created_at)}</p>
        </div>
      </div>
    </header>
  )
}

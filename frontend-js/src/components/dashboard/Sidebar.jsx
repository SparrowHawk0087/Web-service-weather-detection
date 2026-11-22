import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getPredictionStatusLabel } from '../../domain/prediction'

export default function Sidebar({ onNewAnalysis, history = [], onDelete, onRename, onSelect }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('recent')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [pinnedIds, setPinnedIds] = useState(new Set())
  const sidebarRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const filteredHistory = history.filter((item) => (
    tab === 'pinned' ? pinnedIds.has(item.id) : true
  ))

  const initial = user?.name?.charAt(0).toUpperCase() || '?'

  const handleAction = (action, item) => {
    if (action === 'pin' || action === 'unpin') {
      setPinnedIds((current) => {
        const next = new Set(current)
        if (next.has(item.id)) next.delete(item.id)
        else next.add(item.id)
        return next
      })
    }

    if (action === 'delete' && window.confirm(`Удалить "${item.name || item.weather_condition || item.weather_code}"?`)) {
      onDelete?.(item.id)
      setPinnedIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }

    if (action === 'rename' && onRename) {
      const currentName = item.name || item.weather_condition || item.weather_code || ''
      const nextName = window.prompt('Новое название', currentName)?.trim()
      if (nextName && nextName !== currentName) onRename(item.id, nextName)
    }

    setOpenMenuId(null)
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return '—'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const weatherDotClass = (code) => ({
    RAIN: 'bg-blue-400',
    SNOW: 'bg-cyan-300',
    FOG: 'bg-gray-400',
    CLEAR: 'bg-emerald-400',
  })[code] || 'bg-white/30'

  return (
    <aside
      ref={sidebarRef}
      className="w-[280px] shrink-0 bg-black/40 border-r border-white/10 flex flex-col"
    >
      <div className="p-4 border-b border-white/10">
        <Link to="/profile" className="flex items-center gap-3 group">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition">
              {user?.name || 'User'}
            </div>
            <div className="text-white/40 text-xs">View profile</div>
          </div>
          <svg className="w-5 h-5 text-white/50 group-hover:text-white transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </Link>
      </div>

      <div className="p-4 border-b border-white/10">
        <button
          type="button"
          onClick={onNewAnalysis}
          className="w-full py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition"
        >
          + New Analysis
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex bg-white/5 rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab('recent')}
            aria-pressed={tab === 'recent'}
            className={`flex-1 py-1.5 text-xs rounded-full transition ${
              tab === 'recent' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setTab('pinned')}
            aria-pressed={tab === 'pinned'}
            className={`flex-1 py-1.5 text-xs rounded-full transition ${
              tab === 'pinned' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            Pinned
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredHistory.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-6">
            {tab === 'pinned'
              ? 'No pinned analyses yet'
              : 'No analyses yet. Upload and save your first image!'}
          </p>
        ) : (
          filteredHistory.map((item) => {
            const isCompleted = item.status === 'completed'
            const subtitle = isCompleted
              ? `${(Number(item.confidence) * 100).toFixed(0)}%`
              : getPredictionStatusLabel(item.status)

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className="w-full text-left p-3 pr-12 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${weatherDotClass(item.weather_code)}`} />
                    <span className="text-white text-sm truncate">
                      {item.name || item.weather_condition || item.weather_code || getPredictionStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    {formatDate(item.created_at)} · {subtitle}
                  </div>
                  <div className="text-white/30 text-[10px] mt-1.5 truncate">
                    Model: {item.ml_model_version || 'Unknown'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpenMenuId((current) => current === item.id ? null : item.id)
                  }}
                  aria-label={`Actions for ${item.name || item.id}`}
                  aria-expanded={openMenuId === item.id}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {openMenuId === item.id && (
                  <div className="absolute top-full right-0 mt-1 w-40 z-20 bg-[#1a1a25] border border-white/15 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleAction(pinnedIds.has(item.id) ? 'unpin' : 'pin', item)}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition"
                    >
                      {pinnedIds.has(item.id) ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('rename', item)}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction('delete', item)}
                      className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <Link to="/about" className="block text-center text-sm text-white/60 hover:text-white transition">
          About project
        </Link>
      </div>
    </aside>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const TEST_HISTORY = [
  { id: 1, title: 'Analysis #1', date: '03.10.2026', pinned: false },
  { id: 2, title: 'Analysis #2', date: '02.10.2026', pinned: true },
  { id: 3, title: 'Analysis #3', date: '01.10.2026', pinned: false },
  { id: 4, title: 'Analysis #4', date: '30.09.2026', pinned: false },
  { id: 5, title: 'Analysis #5', date: '29.09.2026', pinned: false },
  { id: 6, title: 'Analysis #6', date: '28.09.2026', pinned: true },
]

export default function Sidebar({ onNewAnalysis }) {

    const { user } = useAuth();
    const [tab, setTab] = useState('recent')      // 'recent' | 'pinned'
    const [openMenuId, setOpenMenuId] = useState(null)
    const sidebarRef = useRef(null)

    // popover effect on click
    useEffect(() => {
        const handler = (e) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
            setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = TEST_HISTORY.filter((item) =>
        tab === 'pinned' ? item.pinned : true
    )

    const initial = user?.name?.charAt(0).toUpperCase() || '?'

    const handleNewAnalysis = () => {
        // TODO: clean up drop zone
        if (onNewAnalysis) onNewAnalysis()
    }

    const handleItemClick = (id) => {
        setOpenMenuId(openMenuId === id ? null : id)
    }

    const handleAction = (action, id) => {
        // TODO: connect with API
        console.log('>>> action:', action, 'id:', id);
        setOpenMenuId(null);
    }

    return (
    <aside
      ref={sidebarRef}
      className="w-[280px] shrink-0 bg-black/40 border-r border-white/10 flex flex-col"
    >
      {/* topbar */}
      <div className="p-4 border-b border-white/10">
        <Link
          to="/profile"
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition">
              {user?.name || 'User'}
            </div>
            <div className="text-white/40 text-xs">View profile</div>
          </div>

          {/* icon "stats" */}
          <svg
            className="w-5 h-5 text-white/50 group-hover:text-white transition"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </Link>
      </div>

      {/* button "New Analysis" */}
      <div className="p-4 border-b border-white/10">
        <button
          type="button"
          onClick={handleNewAnalysis}
          className="w-full py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition"
        >
          + New Analysis
        </button>
      </div>

      {/* tabs Recent/Pinned */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex bg-white/5 rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab('recent')}
            className={`flex-1 py-1.5 text-xs rounded-full transition ${
              tab === 'recent'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setTab('pinned')}
            className={`flex-1 py-1.5 text-xs rounded-full transition ${
              tab === 'pinned'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Pinned
          </button>
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-white/40 text-xs text-center py-6">
            No pinned analyses yet
          </p>
        )}

        {filtered.map((item) => (
          <div key={item.id} className="relative">
            <button
              type="button"
              onClick={() => handleItemClick(item.id)}
              className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">
                    {item.title}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {item.date}
                  </div>
                </div>
                <svg
                  className="w-4 h-4 shrink-0 text-white/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>

            {/* Popover */}
            {openMenuId === item.id && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1a1a25] border border-white/15 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleAction(item.pinned ? 'unpin' : 'pin', item.id)}
                  className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition"
                >
                  {item.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('rename', item.id)}
                  className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('delete', item.id)}
                  className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* About project */}
      <div className="p-4 border-t border-white/10">
        <Link
          to="/about"
          className="block text-center text-sm text-white/60 hover:text-white transition"
        >
          About project
        </Link>
      </div>
    </aside>
  )
}
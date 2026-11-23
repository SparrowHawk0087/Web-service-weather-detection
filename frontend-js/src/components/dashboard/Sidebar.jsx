import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import HistoryItem from './HistoryItem'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'pinned', label: 'Избранное' },
  { id: 'errors', label: 'Ошибки' },
  { id: 'processing', label: 'В обработке' },
  { id: 'low-confidence', label: 'Низкая уверенность' },
  { id: 'FOG', label: 'Туман' },
  { id: 'RAIN', label: 'Дождь' },
  { id: 'SNOW', label: 'Снег' },
  { id: 'CLEAR', label: 'Ясно' },
]

const WEATHER_LABELS = {
  FOG: 'Туман',
  RAIN: 'Дождь',
  SNOW: 'Снег',
  CLEAR: 'Ясно',
}

function readStoredSet(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return new Set(Array.isArray(value) ? value : [])
  } catch {
    return new Set()
  }
}

function readStoredOrder(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function formatTimestamp(value) {
  if (!value) return 'Дата неизвестна'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата неизвестна'

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSearchableText(item) {
  return [
    item.name,
    item.original_filename,
    item.weather_condition,
    item.weather_code,
    item.ml_model_version,
    item.status,
  ].filter(Boolean).join(' ').toLocaleLowerCase('ru')
}

export default function Sidebar({
  onNewAnalysis,
  history = [],
  historyCount,
  activeItemId,
  onDelete,
  onRename,
  onSelect,
}) {
  const { user } = useAuth()
  const userKey = String(user?.id || user?.email || 'user')
  const favoritesKey = 'fsr-history-favorites:' + userKey
  const orderKey = 'fsr-history-order:' + userKey
  const collapsedKey = 'fsr-history-collapsed:' + userKey

  const [filter, setFilter] = useState('all')
  const [sortMode, setSortMode] = useState('new')
  const [query, setQuery] = useState('')
  const [pinnedIds, setPinnedIds] = useState(() => readStoredSet(favoritesKey))
  const [manualOrder, setManualOrder] = useState(() => readStoredOrder(orderKey))
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(collapsedKey) === 'true'
    } catch {
      return false
    }
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    setPinnedIds(readStoredSet(favoritesKey))
    setManualOrder(readStoredOrder(orderKey))
    try {
      setIsCollapsed(localStorage.getItem(collapsedKey) === 'true')
    } catch {
      setIsCollapsed(false)
    }
    setSelectedIds(new Set())
    setQuery('')
    setFilter('all')
  }, [favoritesKey, orderKey, collapsedKey])

  useEffect(() => {
    try {
      localStorage.setItem(favoritesKey, JSON.stringify([...pinnedIds]))
    } catch {
      // The history remains usable when browser storage is unavailable.
    }
  }, [favoritesKey, pinnedIds])

  useEffect(() => {
    try {
      localStorage.setItem(orderKey, JSON.stringify(manualOrder))
    } catch {
      // Manual ordering is an optional local preference.
    }
  }, [orderKey, manualOrder])

  useEffect(() => {
    try {
      localStorage.setItem(collapsedKey, String(isCollapsed))
    } catch {
      // Sidebar state is not required for core application behavior.
    }
  }, [collapsedKey, isCollapsed])

  useEffect(() => {
    if (editingId === null) return undefined
    editInputRef.current?.focus()
    editInputRef.current?.select()
    return undefined
  }, [editingId])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null)
        setIsMobileOpen(false)
        if (editingId !== null) {
          setEditingId(null)
          setEditingValue('')
        }
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingId])

  const initial = user?.name?.charAt(0).toUpperCase() || '?'
  const count = Number.isFinite(historyCount) ? historyCount : history.length

  const isPinned = (item) => (
    typeof item.is_favorite === 'boolean'
      ? item.is_favorite
      : pinnedIds.has(item.id)
  )

  const filteredHistory = useMemo(() => {
    let items = [...history]

    if (filter === 'pinned') {
      items = items.filter((item) => (
        typeof item.is_favorite === 'boolean'
          ? item.is_favorite
          : pinnedIds.has(item.id)
      ))
    } else if (filter === 'errors') {
      items = items.filter((item) => item.status === 'failed')
    } else if (filter === 'processing') {
      items = items.filter((item) => ['pending', 'processing'].includes(item.status))
    } else if (filter === 'low-confidence') {
      items = items.filter((item) => item.low_confidence === true)
    } else if (WEATHER_LABELS[filter]) {
      items = items.filter((item) => item.weather_code === filter)
    }

    const normalizedQuery = query.trim().toLocaleLowerCase('ru')
    if (normalizedQuery) {
      items = items.filter((item) => getSearchableText(item).includes(normalizedQuery))
    }

    if (sortMode === 'name') {
      items.sort((left, right) => (
        (left.name || left.original_filename || '').localeCompare(
          right.name || right.original_filename || '',
          'ru',
          { sensitivity: 'base' },
        )
      ))
    } else if (sortMode === 'confidence') {
      items.sort((left, right) => (
        (Number(right.confidence) || -1) - (Number(left.confidence) || -1)
      ))
    } else if (sortMode === 'manual') {
      const positions = new Map(manualOrder.map((id, index) => [id, index]))
      items.sort((left, right) => (
        (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER)
        - (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      ))
    } else {
      items.sort((left, right) => (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ))
    }

    return items
  }, [filter, history, manualOrder, pinnedIds, query, sortMode])

  const toggleFavorite = (item) => {
    setPinnedIds((current) => {
      const next = new Set(current)
      if (isPinned(item)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
    setOpenMenuId(null)
  }

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startRename = (item) => {
    setEditingId(item.id)
    setEditingValue(item.name || item.original_filename || '')
    setOpenMenuId(null)
  }

  const finishRename = async (id, shouldSave = true) => {
    if (editingId !== id) return
    const nextName = editingValue.trim()
    const item = history.find((record) => record.id === id)
    const currentName = item?.name || item?.original_filename || ''

    setEditingId(null)
    setEditingValue('')

    if (!shouldSave || !nextName || nextName === currentName || !onRename) return

    try {
      await onRename(id, nextName)
    } catch {
      // The parent owns API error reporting and keeps the original record.
    }
  }

  const handleDelete = async (item) => {
    const label = item.name || item.original_filename || 'этот анализ'
    if (!onDelete || !window.confirm('Удалить «' + label + '» из истории?')) return

    try {
      await onDelete(item.id)
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
      setPinnedIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    } catch {
      // The parent owns API error reporting.
    }
    setOpenMenuId(null)
  }

  const handleBulkDelete = async () => {
    if (!onDelete || selectedIds.size === 0 || isBulkDeleting) return
    const ids = [...selectedIds]
    if (!window.confirm('Удалить выбранные записи (' + ids.length + ')?')) return

    setIsBulkDeleting(true)
    const results = await Promise.allSettled(ids.map((id) => onDelete(id)))
    const removedIds = ids.filter((id, index) => (
      results[index].status === 'fulfilled' && results[index].value !== false
    ))

    setSelectedIds((current) => {
      const next = new Set(current)
      removedIds.forEach((id) => next.delete(id))
      return next
    })
    setPinnedIds((current) => {
      const next = new Set(current)
      removedIds.forEach((id) => next.delete(id))
      return next
    })
    setIsBulkDeleting(false)
  }

  const handleBulkPin = () => {
    setPinnedIds((current) => {
      const next = new Set(current)
      selectedIds.forEach((id) => next.add(id))
      return next
    })
    setSelectedIds(new Set())
  }

  const handleDragStart = (event, id) => {
    if (sortMode !== 'manual') return
    setDraggedId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  const handleDrop = (event, targetId) => {
    event.preventDefault()
    if (draggedId === null || draggedId === targetId) return

    const ids = filteredHistory.map((item) => item.id)
    const from = ids.indexOf(draggedId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return

    ids.splice(from, 1)
    ids.splice(to, 0, draggedId)
    const unaffectedIds = manualOrder.filter((id) => !ids.includes(id))
    setManualOrder([...ids, ...unaffectedIds])
    setSortMode('manual')
    setDraggedId(null)
  }

  const handleSelect = (item) => {
    onSelect?.(item)
    setOpenMenuId(null)
    setIsMobileOpen(false)
  }

  const sidebarClasses = [
    'history-sidebar',
    isCollapsed ? 'is-collapsed' : '',
    isMobileOpen ? 'is-mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <button
        type="button"
        className="history-mobile-trigger"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Открыть историю анализов"
        aria-expanded={isMobileOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>История</span>
        <span className="history-mobile-count">{count}</span>
      </button>

      {isMobileOpen && (
        <button
          type="button"
          className="history-sidebar-scrim"
          aria-label="Закрыть историю"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside ref={sidebarRef} className={sidebarClasses} aria-label="История анализов">
        <div className="history-sidebar-header">
          <Link to="/profile" className="history-user-card" title="Открыть профиль">
            <span className="history-avatar">{initial}</span>
            <span className="history-user-copy">
              <span className="history-user-name">{user?.name || 'Пользователь'}</span>
              <span className="history-user-caption">Открыть профиль и статистику</span>
            </span>
            <svg className="history-profile-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
            </svg>
          </Link>

          <button
            type="button"
            className="history-collapse-button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? 'Развернуть историю' : 'Свернуть историю'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Развернуть историю' : 'Свернуть историю'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 6-6 6 6 6M20 6l-6 6 6 6" />
            </svg>
          </button>

          <button
            type="button"
            className="history-mobile-close"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Закрыть историю"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="history-sidebar-actions">
          <button
            type="button"
            className="history-new-button"
            onClick={onNewAnalysis}
          >
            <span className="history-new-plus" aria-hidden="true">＋</span>
            <span>Новый анализ</span>
          </button>
        </div>

        <div className="history-sidebar-summary">
          <div>
            <p className="history-section-kicker">Рабочая область</p>
            <h2 className="history-section-title">История анализов</h2>
          </div>
          <span className="history-total-chip" title="Всего записей в истории">{count}</span>
        </div>

        <div className="history-toolbar">
          <label className="history-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по истории…"
              aria-label="Поиск по истории"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск">
                ×
              </button>
            )}
          </label>

          <label className="history-sort">
            <span>Сортировка</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              aria-label="Сортировка истории"
            >
              <option value="new">Сначала новые</option>
              <option value="manual">Вручную</option>
              <option value="name">По имени</option>
              <option value="confidence">По уверенности</option>
            </select>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </label>
        </div>

        <div className="history-filter-section">
          <div className="history-filter-heading">
            <span>Быстрые фильтры</span>
            <button
              type="button"
              onClick={() => {
                setFilter('all')
                setQuery('')
              }}
            >
              Сбросить
            </button>
          </div>
          <div className="history-filter-chips" role="group" aria-label="Фильтры истории">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={'history-filter-chip' + (filter === item.id ? ' is-active' : '')}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="history-bulk-toolbar" aria-live="polite">
            <div className="history-bulk-count">
              <strong>{selectedIds.size}</strong>
              <span>Выбрано</span>
            </div>
            <div className="history-bulk-actions">
              <button type="button" onClick={handleBulkPin} title="Добавить в избранное">
                <span aria-hidden="true">★</span>
                <span>Закрепить</span>
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? 'Удаление…' : 'Удалить'}
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())}>
                Снять
              </button>
            </div>
          </div>
        )}

        <div className="history-list-heading">
          <span>{filter === 'all' ? 'Все записи' : FILTERS.find((item) => item.id === filter)?.label}</span>
          <span>{filteredHistory.length}{history.length < count ? ' из ' + count : ''}</span>
        </div>

        <div className="history-list" ref={menuRef}>
          {filteredHistory.length === 0 ? (
            <div className="history-empty-state">
              <span className="history-empty-icon" aria-hidden="true">
                {query ? '⌕' : filter === 'pinned' ? '☆' : '◌'}
              </span>
              <strong>
                {query
                  ? 'Ничего не найдено'
                  : filter === 'all'
                    ? 'История пока пуста'
                    : 'Нет записей в этом представлении'}
              </strong>
              <span>
                {query
                  ? 'Попробуйте изменить поисковый запрос.'
                  : filter === 'all'
                    ? 'Загрузите изображение, чтобы начать анализ дорожной погоды.'
                    : 'Измените фильтр или вернитесь ко всем записям.'}
              </span>
              {(query || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  Показать все записи
                </button>
              )}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                isPinned={isPinned(item)}
                isSelected={selectedIds.has(item.id)}
                isActive={activeItemId === item.id}
                isEditing={editingId === item.id}
                editingValue={editingValue}
                editInputRef={editingId === item.id ? editInputRef : null}
                isMenuOpen={openMenuId === item.id}
                isDraggable={sortMode === 'manual'}
                isDragging={draggedId === item.id}
                onSelect={() => handleSelect(item)}
                onToggleSelected={() => toggleSelected(item.id)}
                onEditingChange={setEditingValue}
                onRenameSubmit={(save) => finishRename(item.id, save)}
                onMenuToggle={() => setOpenMenuId((current) => current === item.id ? null : item.id)}
                onRename={() => startRename(item)}
                onFavorite={() => toggleFavorite(item)}
                onDelete={() => handleDelete(item)}
                onDragStart={(event) => handleDragStart(event, item.id)}
                onDragOver={(event) => {
                  if (sortMode === 'manual' && draggedId !== null) event.preventDefault()
                }}
                onDrop={(event) => handleDrop(event, item.id)}
                onDragEnd={() => setDraggedId(null)}
              />
            ))
          )}
        </div>

        <div className="history-sidebar-footer">
          <Link to="/about">О проекте</Link>
          <span>FSR-WEATHER</span>
        </div>
      </aside>
    </>
  )
}

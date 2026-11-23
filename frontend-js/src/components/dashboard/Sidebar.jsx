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

function readStoredOrder(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function buildFilterParams(filter, query, sortMode) {
  const params = { q: query || undefined }
  if (filter === 'pinned') params.favorite = true
  else if (filter === 'errors') params.status = 'failed'
  else if (filter === 'processing') params.status = 'pending,processing'
  else if (filter === 'low-confidence') params.lowConfidence = true
  else if (['FOG', 'RAIN', 'SNOW', 'CLEAR'].includes(filter)) params.weatherCode = filter

  if (sortMode === 'name') params.sort = 'name'
  else if (sortMode === 'confidence') params.sort = 'confidence'
  else params.sort = 'newest'

  return params
}

export default function Sidebar({
  onNewAnalysis,
  history = [],
  activeItemId,
  onDelete,
  onBulkDelete,
  onRename,
  onToggleFavorite,
  onSelect,
  onHistoryFiltersChange,
  onLoadMore,
  onRetry,
  hasMore = false,
  isHistoryLoading = false,
  isLoadingMore = false,
  historyError = null,
}) {
  const { user } = useAuth()
  const userKey = String(user?.id || user?.email || 'current')
  const orderKey = 'fsr-history-order:' + userKey
  const collapsedKey = 'fsr-history-collapsed:' + userKey

  const [filter, setFilter] = useState('all')
  const [sortMode, setSortMode] = useState('new')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [manualOrder, setManualOrder] = useState(() => readStoredOrder(orderKey))
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(collapsedKey) === 'true' } catch { return false }
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkPinning, setIsBulkPinning] = useState(false)

  const sidebarRef = useRef(null)
  const listRef = useRef(null)
  const sentinelRef = useRef(null)
  const editInputRef = useRef(null)
  const renameFinishedRef = useRef(false)

  useEffect(() => {
    try { localStorage.setItem(orderKey, JSON.stringify(manualOrder)) } catch { /* optional preference */ }
  }, [orderKey, manualOrder])

  useEffect(() => {
    try { localStorage.setItem(collapsedKey, String(isCollapsed)) } catch { /* optional preference */ }
  }, [collapsedKey, isCollapsed])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    onHistoryFiltersChange?.(buildFilterParams(filter, debouncedQuery, sortMode))
  }, [filter, debouncedQuery, sortMode, onHistoryFiltersChange])

  useEffect(() => {
    if (editingId === null) return undefined
    editInputRef.current?.focus()
    editInputRef.current?.select()
    return undefined
  }, [editingId, openMenuId])

  useEffect(() => {
    const handleOutside = (event) => {
      if (event.target.closest?.('[data-history-menu="true"], [data-history-menu-trigger="true"]')) return
      if (openMenuId !== null) setOpenMenuId(null)
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setOpenMenuId(null)
      setIsMobileOpen(false)
      if (editingId !== null) {
        renameFinishedRef.current = true
        setEditingId(null)
        setEditingValue('')
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingId])

  useEffect(() => {
    const root = listRef.current
    const target = sentinelRef.current
    if (!root || !target || !hasMore || isLoadingMore || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore?.()
    }, { root, rootMargin: '120px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore, history.length])

  const filteredHistory = useMemo(() => {
    if (sortMode !== 'manual') return history
    const positions = new Map(manualOrder.map((id, index) => [id, index]))
    return [...history].sort((left, right) => (
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    ))
  }, [history, manualOrder, sortMode])

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startRename = (item) => {
    renameFinishedRef.current = false
    setEditingId(item.id)
    setEditingValue(item.name || item.original_filename || '')
    setOpenMenuId(null)
  }

  const finishRename = async (id, shouldSave = true) => {
    if (editingId !== id || renameFinishedRef.current) return
    renameFinishedRef.current = true
    const nextName = editingValue.trim()
    const item = history.find((record) => record.id === id)
    const currentName = item?.name || item?.original_filename || ''
    setEditingId(null)
    setEditingValue('')
    if (!shouldSave || !nextName || nextName === currentName || !onRename) return
    await onRename(id, nextName)
  }

  const handleDelete = async (item) => {
    const label = item.name || item.original_filename || 'этот анализ'
    if (!onDelete || !window.confirm('Удалить «' + label + '» из истории?')) return
    const deleted = await onDelete(item.id)
    if (deleted) {
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
    setOpenMenuId(null)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkDeleting || !onBulkDelete) return
    const ids = [...selectedIds]
    if (!window.confirm('Удалить выбранные записи (' + ids.length + ')?')) return
    setIsBulkDeleting(true)
    try {
      const deleted = await onBulkDelete(ids)
      if (deleted) setSelectedIds(new Set())
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleBulkPin = async () => {
    if (isBulkPinning || selectedIds.size === 0) return
    const targets = history.filter((item) => selectedIds.has(item.id) && !item.is_favorite)
    setIsBulkPinning(true)
    const results = await Promise.allSettled(targets.map((item) => onToggleFavorite?.(item)))
    const succeeded = results.every((result) => result.status === 'fulfilled' && result.value === true)
    if (succeeded) setSelectedIds(new Set())
    setIsBulkPinning(false)
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
    setManualOrder([...ids, ...manualOrder.filter((id) => !ids.includes(id))])
    setSortMode('manual')
    setDraggedId(null)
  }

  const handleSelect = (item) => {
    onSelect?.(item)
    setOpenMenuId(null)
    setIsMobileOpen(false)
  }

  const resetFilters = () => {
    setFilter('all')
    setQuery('')
    setSortMode('new')
    setSelectedIds(new Set())
  }

  const sidebarClasses = [
    'history-sidebar',
    isCollapsed ? 'is-collapsed' : '',
    isMobileOpen ? 'is-mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <button type="button" className="history-mobile-trigger" onClick={() => setIsMobileOpen(true)} aria-label="Открыть историю анализов" aria-expanded={isMobileOpen}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        <span>История</span>
      </button>
      {isMobileOpen && <button type="button" className="history-sidebar-scrim" aria-label="Закрыть историю" onClick={() => setIsMobileOpen(false)} />}

      <aside ref={sidebarRef} className={sidebarClasses} aria-label="История анализов">
        <div className="history-sidebar-header">
          <Link to="/profile" className="history-user-card" title="Открыть профиль">
            <span className="history-avatar">{user?.name?.charAt(0).toUpperCase() || '?'}</span>
            <span className="history-user-copy">
              <span className="history-user-name">{user?.name || 'Пользователь'}</span>
            </span>
            <svg className="history-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>
          </Link>
          <button type="button" className="history-collapse-button" onClick={() => setIsCollapsed((value) => !value)} aria-label={isCollapsed ? 'Развернуть историю' : 'Свернуть историю'} aria-expanded={!isCollapsed}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M20 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" className="history-mobile-close" onClick={() => setIsMobileOpen(false)} aria-label="Закрыть историю">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="history-sidebar-actions">
          <button type="button" className="history-new-button" onClick={onNewAnalysis}>
            <span className="history-new-plus" aria-hidden="true">＋</span><span>Новый анализ</span>
          </button>
        </div>

        <div className="history-sidebar-summary">
          <h2 className="history-section-title">История анализов</h2>
        </div>

        <div className="history-toolbar">
          <label className="history-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIds(new Set()) }} placeholder="Поиск по истории…" aria-label="Поиск по истории" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск">×</button>}
          </label>
          <label className="history-sort">
            <select value={sortMode} onChange={(event) => { setSortMode(event.target.value); setSelectedIds(new Set()) }} aria-label="Сортировка истории">
              <option value="new">Сначала новые</option>
              <option value="manual">Вручную (загруженные)</option>
              <option value="name">По имени</option>
              <option value="confidence">По уверенности</option>
            </select>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
          </label>
        </div>

        <div className="history-filter-section">
          <div className="history-filter-heading"><button type="button" onClick={resetFilters}>Сбросить фильтры</button></div>
          <div className="history-filter-chips" role="group" aria-label="Фильтры истории">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" className={'history-filter-chip' + (filter === item.id ? ' is-active' : '')} onClick={() => { setFilter(item.id); setSelectedIds(new Set()) }} aria-pressed={filter === item.id}>{item.label}</button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="history-bulk-toolbar" aria-live="polite">
            <div className="history-bulk-count"><strong>{selectedIds.size}</strong><span>Выбрано</span></div>
            <div className="history-bulk-actions">
              <button type="button" onClick={handleBulkPin} disabled={isBulkPinning}>{isBulkPinning ? 'Сохранение…' : '★ Закрепить'}</button>
              <button type="button" className="is-danger" onClick={handleBulkDelete} disabled={isBulkDeleting || !onBulkDelete}>{isBulkDeleting ? 'Удаление…' : 'Удалить'}</button>
              <button type="button" onClick={() => setSelectedIds(new Set())}>Снять</button>
            </div>
          </div>
        )}

        <div className="history-list-heading">
          <span>{FILTERS.find((item) => item.id === filter)?.label || 'Все записи'}</span>
        </div>

        <div className="history-list" ref={listRef} onScroll={() => setOpenMenuId(null)}>
          {historyError ? (
            <div className="history-empty-state" role="alert">
              <strong>Не удалось загрузить историю</strong><span>{historyError}</span>
              <button type="button" onClick={onRetry}>Повторить</button>
            </div>
          ) : isHistoryLoading && history.length === 0 ? (
            <div className="history-loading-state" aria-label="Загрузка истории">
              {[0, 1, 2, 3].map((item) => <div className="history-skeleton-card" key={item} />)}
            </div>
          ) : history.length === 0 ? (
            <div className="history-empty-state">
              <span className="history-empty-icon" aria-hidden="true">{query ? '⌕' : '◌'}</span>
              <strong>{query ? 'Ничего не найдено' : filter === 'all' ? 'История пока пуста' : 'Нет записей в этом представлении'}</strong>
              <span>{query ? 'Попробуйте изменить поисковый запрос.' : 'Загрузите изображение или измените фильтр.'}</span>
              {(query || filter !== 'all') && <button type="button" onClick={resetFilters}>Показать все записи</button>}
            </div>
          ) : (
            <>
              {filteredHistory.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  isPinned={item.is_favorite === true}
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
                  onFavorite={async () => { await onToggleFavorite?.(item); setOpenMenuId(null) }}
                  onDelete={() => handleDelete(item)}
                  onDragStart={(event) => handleDragStart(event, item.id)}
                  onDragOver={(event) => { if (sortMode === 'manual' && draggedId !== null) event.preventDefault() }}
                  onDrop={(event) => handleDrop(event, item.id)}
                  onDragEnd={() => setDraggedId(null)}
                />
              ))}
              {hasMore && (
                <div className="history-load-more" ref={sentinelRef}>
                  <button type="button" onClick={onLoadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? 'Загрузка…' : 'Загрузить ещё'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="history-sidebar-footer"><Link to="/about">О проекте</Link><span>FSR-WEATHER</span></div>
      </aside>
    </>
  )
}

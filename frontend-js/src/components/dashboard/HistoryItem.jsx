import { getPredictionStatusLabel } from '../../domain/prediction'
import { usePredictionImage } from '../../hooks/usePredictionImage'

const WEATHER = {
  FOG: { icon: '🌫️', label: 'Туман' },
  RAIN: { icon: '🌧️', label: 'Дождь' },
  SNOW: { icon: '❄️', label: 'Снег' },
  CLEAR: { icon: '☀️', label: 'Ясно' },
}

const STATUS_CLASS = {
  pending: 'is-pending',
  processing: 'is-processing',
  completed: 'is-completed',
  failed: 'is-failed',
  cancelled: 'is-cancelled',
}

function formatDate(value) {
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

export default function HistoryItem({
  item,
  isPinned,
  isSelected,
  isActive,
  isEditing,
  editingValue,
  editInputRef,
  isMenuOpen,
  isDraggable,
  isDragging,
  onSelect,
  onToggleSelected,
  onEditingChange,
  onRenameSubmit,
  onMenuToggle,
  onRename,
  onFavorite,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const imageUrl = usePredictionImage(item.image_url)
  const weather = WEATHER[item.weather_code] || { icon: '◌', label: 'Не определено' }
  const statusClass = STATUS_CLASS[item.status] || 'is-cancelled'
  const title = item.name || item.original_filename || 'Без названия'
  const hasResult = item.status === 'completed' && Number.isFinite(Number(item.confidence))
  const confidence = hasResult ? (Number(item.confidence) * 100).toFixed(1) + '%' : null

  return (
    <article
      className={[
        'history-item',
        isActive ? 'is-active' : '',
        isPinned ? 'is-pinned' : '',
        isSelected ? 'is-selected' : '',
        isDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      draggable={isDraggable && !isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="history-item-heading">
        <input
          type="checkbox"
          className="history-item-checkbox"
          checked={isSelected}
          onChange={onToggleSelected}
          aria-label={'Выбрать запись ' + title}
        />

        {isEditing ? (
          <input
            ref={editInputRef}
            className="history-rename-input"
            value={editingValue}
            onChange={(event) => onEditingChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onRenameSubmit(true)
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onRenameSubmit(false)
              }
            }}
            onBlur={() => onRenameSubmit(true)}
            maxLength={120}
            aria-label="Новое название записи"
          />
        ) : (
          <button type="button" className="history-item-title" onClick={onSelect} title={title}>
            {title}
          </button>
        )}

        <span className={'history-status-badge ' + statusClass}>
          {getPredictionStatusLabel(item.status)}
        </span>

        {item.low_confidence && (
          <span className="history-low-confidence" title="Уверенность ниже порога класса">!</span>
        )}

        {isPinned && <span className="history-pin-mark" title="В избранном">★</span>}

        <button
          type="button"
          className="history-item-menu-button"
          onClick={onMenuToggle}
          aria-label={'Действия для ' + title}
          aria-expanded={isMenuOpen}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5" r="1.2" />
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="12" cy="19" r="1.2" />
          </svg>
        </button>
      </div>

      <button type="button" className="history-item-body" onClick={onSelect}>
        <span className="history-item-thumbnail">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true" className="history-thumbnail-placeholder">
              {weather.icon}
            </span>
          )}
        </span>
        <span className="history-item-meta">
          <span className="history-item-weather">
            <strong>{weather.icon} {item.weather_condition || weather.label}</strong>
            {confidence && <span className="history-item-confidence">{confidence}</span>}
          </span>
          <span className="history-item-date">{formatDate(item.created_at)}</span>
          <span className="history-item-model">{item.ml_model_version || 'Модель не указана'}</span>
        </span>
      </button>

      {isMenuOpen && (
        <div className="history-context-menu">
          <button type="button" onClick={onSelect}>Открыть подробности</button>
          <button type="button" onClick={onRename}>Переименовать</button>
          <button type="button" onClick={onFavorite}>
            {isPinned ? 'Убрать из избранного' : 'Добавить в избранное'}
          </button>
          <button type="button" className="is-danger" onClick={onDelete}>Удалить</button>
        </div>
      )}
    </article>
  )
}

import { Link } from 'react-router-dom'

export default function ProfileHeader({ onLogout }) {
  return (
    <header className="profile-view-head">
      <div className="min-w-0">
        <p className="profile-kicker">Bento analytics</p>
        <h1 className="profile-heading">Профиль и статистика</h1>
        <p className="profile-lead">
          Живые метрики по истории, активность и вклад в улучшение модели. История анализов скрыта, чтобы ничего не отвлекало.
        </p>
      </div>

      <div className="profile-header-actions">
        <Link to="/dashboard" className="profile-button">
          <span aria-hidden="true">←</span>
          На главный экран
        </Link>
        <button type="button" onClick={onLogout} className="profile-text-button">
          Выйти
        </button>
      </div>
    </header>
  )
}

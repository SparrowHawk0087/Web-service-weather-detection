import { Link } from 'react-router-dom'

export default function ProfileHeader({ onLogout }) {
  return (
    <header className="profile-view-head">
      <h1 className="profile-heading">Профиль и статистика</h1>

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

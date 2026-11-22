export default function PreferencesCard({ enabled = true, onChange, saving = false }) {
  return (
    <div className="profile-preference-wrap">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Анимации интерфейса"
        disabled={saving}
        onClick={() => onChange(!enabled)}
        className={`profile-switch ${enabled ? 'is-on' : ''}`}
      >
        <span className="profile-switch-label">Анимации интерфейса</span>
        <span className={`profile-switch-track ${enabled ? 'is-on' : ''}`} aria-hidden="true">
          <span className="profile-switch-thumb" />
        </span>
      </button>
      {saving && <span className="profile-switch-feedback" role="status">Сохранение…</span>}
    </div>
  )
}

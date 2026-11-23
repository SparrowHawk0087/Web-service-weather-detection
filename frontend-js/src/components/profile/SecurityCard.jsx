import { useState } from 'react'

export default function SecurityCard({ onUpdatePassword, saving = false, children }) {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
    setSuccess(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (form.password.length < 8) {
      setError('Новый пароль должен содержать минимум 8 символов.')
      return
    }
    if (form.password !== form.password_confirmation) {
      setError('Пароли не совпадают.')
      return
    }

    try {
      await onUpdatePassword(form)
      setForm({ current_password: '', password: '', password_confirmation: '' })
      setSuccess(true)
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось изменить пароль.')
    }
  }

  return (
    <section className="profile-glass-card profile-secondary-card">
      <div className="profile-section-head">
        <h2 className="profile-section-title">Безопасность</h2>
      </div>

      <form onSubmit={submit} className="profile-form">
        <div className="profile-field">
          <label htmlFor="current-password" className="profile-field-label">Текущий пароль</label>
          <input id="current-password" name="current_password" type="password" autoComplete="current-password" required value={form.current_password} onChange={updateField} className="profile-input" />
        </div>
        <div className="profile-field">
          <label htmlFor="new-password" className="profile-field-label">Новый пароль</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={updateField} className="profile-input" />
        </div>
        <div className="profile-field">
          <label htmlFor="confirm-password" className="profile-field-label">Подтвердите пароль</label>
          <input id="confirm-password" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required value={form.password_confirmation} onChange={updateField} className="profile-input" />
        </div>

        {error && <p role="alert" className="profile-field-error">{error}</p>}
        {success && <p role="status" className="profile-form-success">Пароль успешно обновлён.</p>}

        <button type="submit" disabled={saving || !form.current_password || !form.password || !form.password_confirmation} className="profile-button profile-button-primary profile-button-full">
          {saving ? 'Обновление…' : 'Изменить пароль'}
        </button>
      </form>

      {children && (
        <div className="profile-security-data">
          <div className="profile-security-divider" />
          <h3 className="profile-security-data-title">Управление данными</h3>
          {children}
        </div>
      )}
    </section>
  )
}

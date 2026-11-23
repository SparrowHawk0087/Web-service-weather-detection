import { useState } from 'react'
import PreferencesCard from './PreferencesCard.jsx'

export default function ProfileCard({
  user,
  onSave,
  saving = false,
  animationsEnabled = true,
  onPreferenceChange,
  savingPreferences = false,
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const emailChanged = form.email.trim().toLowerCase() !== (user?.email || '').toLowerCase()
  const dirty = form.name.trim() !== (user?.name || '') || emailChanged
  const initial = user?.name?.trim()?.charAt(0)?.toLocaleUpperCase() || '?'

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [event.target.name]: '' }))
    setError('')
  }

  function resetForm() {
    setForm({ name: user?.name || '', email: user?.email || '', currentPassword: '' })
    setFieldErrors({})
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    const name = form.name.trim()
    const email = form.email.trim()

    if (name.length < 3 || name.length > 50) nextErrors.name = 'Имя должно содержать от 3 до 50 символов.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Введите корректный email.'
    if (emailChanged && !form.currentPassword) nextErrors.currentPassword = 'Для смены почты требуется текущий пароль.'

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length || !dirty) return

    try {
      const payload = { name }
      if (emailChanged) {
        payload.email = email
        payload.current_password = form.currentPassword
      }
      const updatedUser = await onSave(payload)
      setForm({ name: updatedUser.name || '', email: updatedUser.email || '', currentPassword: '' })
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить изменения.')
    }
  }

  return (
    <section className="profile-glass-card profile-account-card">
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">{initial}</div>
        <div className="profile-identity-copy">
          <p className="profile-identity-name">{user?.name || 'Пользователь'}</p>
          <p className="profile-identity-email">{user?.email || '—'}</p>
        </div>
      </div>

      <form onSubmit={submit} className="profile-form">
        <div className="profile-field">
          <label htmlFor="profile-name" className="profile-field-label">Псевдоним</label>
          <input
            id="profile-name"
            name="name"
            autoComplete="name"
            maxLength={50}
            value={form.name}
            onChange={updateField}
            className="profile-input"
          />
          {fieldErrors.name && <p className="profile-field-error">{fieldErrors.name}</p>}
        </div>

        <div className="profile-field">
          <label htmlFor="profile-email" className="profile-field-label">Почта</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={updateField}
            className="profile-input"
          />
          {fieldErrors.email && <p className="profile-field-error">{fieldErrors.email}</p>}
        </div>

        {emailChanged && (
          <div className="profile-field">
            <label htmlFor="profile-current-password" className="profile-field-label">Текущий пароль</label>
            <input
              id="profile-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={updateField}
              className="profile-input"
            />
            {fieldErrors.currentPassword && <p className="profile-field-error">{fieldErrors.currentPassword}</p>}
          </div>
        )}

        <PreferencesCard
          enabled={animationsEnabled}
          onChange={onPreferenceChange}
          saving={savingPreferences}
        />

        {error && <p role="alert" className="profile-form-error">{error}</p>}

        <div className="profile-actions">
          <button type="submit" disabled={!dirty || saving} className="profile-button profile-button-primary">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button type="button" onClick={resetForm} disabled={!dirty || saving} className="profile-button">
            Сброс
          </button>
        </div>
      </form>
    </section>
  )
}

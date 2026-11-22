import { useEffect, useState } from 'react'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15'

export default function ProfileCard({ user, onSave, saving = false }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    setForm({ name: user?.name || '', email: user?.email || '', currentPassword: '' })
    setError('')
    setFieldErrors({})
  }, [user?.name, user?.email])

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
    if (emailChanged && !form.currentPassword) nextErrors.currentPassword = 'Для смены email требуется текущий пароль.'

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    if (!dirty) return

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
    <section className="profile-glass-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="profile-eyebrow">Account</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Данные аккаунта</h2>
        </div>
        <span className="rounded-xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100">
          {user?.role || 'user'}
        </span>
      </div>

      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/90 to-fuchsia-500/80 text-2xl font-semibold text-white shadow-lg shadow-violet-950/30">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{user?.name || 'Пользователь'}</p>
          <p className="truncate text-sm text-white/45">{user?.email || '—'}</p>
          <p className="mt-1 text-[11px] text-white/35">Аватар формируется автоматически</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium text-white/65">Имя / псевдоним</label>
          <input id="profile-name" name="name" autoComplete="name" maxLength={50} value={form.name} onChange={updateField} className={inputClass} />
          {fieldErrors.name && <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="profile-email" className="mb-1.5 block text-xs font-medium text-white/65">Email</label>
          <input id="profile-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} className={inputClass} />
          {fieldErrors.email && <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.email}</p>}
        </div>

        {emailChanged && (
          <div>
            <label htmlFor="profile-current-password" className="mb-1.5 block text-xs font-medium text-white/65">Текущий пароль для смены email</label>
            <input id="profile-current-password" name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={updateField} className={inputClass} />
            {fieldErrors.currentPassword && <p className="mt-1.5 text-xs text-rose-300">{fieldErrors.currentPassword}</p>}
          </div>
        )}

        {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={!dirty || saving} className="flex-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
          <button type="button" onClick={resetForm} disabled={!dirty || saving} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-40">
            Сбросить
          </button>
        </div>
      </form>
    </section>
  )
}

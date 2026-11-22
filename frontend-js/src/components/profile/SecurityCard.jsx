import { useState } from 'react'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15'

export default function SecurityCard({ onUpdatePassword, saving = false }) {
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
    <section className="profile-glass-card p-5 sm:p-6">
      <div className="mb-4">
        <p className="profile-eyebrow">Security</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Безопасность</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/40">Смена пароля завершит остальные активные сессии.</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-xs font-medium text-white/65">Текущий пароль</label>
          <input id="current-password" name="current_password" type="password" autoComplete="current-password" required value={form.current_password} onChange={updateField} className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-white/65">Новый пароль</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={updateField} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-white/65">Подтвердите пароль</label>
          <input id="confirm-password" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required value={form.password_confirmation} onChange={updateField} className={inputClass} />
        </div>

        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        {success && <p role="status" className="text-xs text-emerald-200">Пароль успешно обновлён.</p>}

        <button type="submit" disabled={saving || !form.current_password || !form.password || !form.password_confirmation} className="w-full rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? 'Обновление…' : 'Изменить пароль'}
        </button>
      </form>
    </section>
  )
}

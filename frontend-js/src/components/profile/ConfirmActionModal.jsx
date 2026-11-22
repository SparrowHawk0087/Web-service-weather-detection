import { useEffect, useState } from 'react'

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  requirePassword = false,
  requireDeleteWord = false,
  saving = false,
  onCancel,
  onConfirm,
}) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmation('')
      setError('')
    }
  }, [open])

  if (!open) return null

  async function submit(event) {
    event.preventDefault()
    if (requireDeleteWord && confirmation !== 'DELETE') {
      setError('Введите DELETE, чтобы подтвердить удаление аккаунта.')
      return
    }

    setError('')
    try {
      await onConfirm({
        current_password: password,
        confirmation,
      })
      onCancel()
    } catch (requestError) {
      setError(requestError.message || 'Не удалось выполнить действие.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-xl text-rose-200" aria-hidden="true">
          !
        </div>
        <h2 id="confirm-title" className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {requirePassword && (
            <div>
              <label htmlFor="confirm-current-password" className="mb-1.5 block text-xs font-medium text-white/65">Текущий пароль</label>
              <input
                id="confirm-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-3 text-sm text-white outline-none focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/10"
              />
            </div>
          )}

          {requireDeleteWord && (
            <div>
              <label htmlFor="confirm-delete-word" className="mb-1.5 block text-xs font-medium text-white/65">Введите DELETE для подтверждения</label>
              <input
                id="confirm-delete-word"
                type="text"
                autoComplete="off"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-3 text-sm text-white outline-none focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/10"
              />
            </div>
          )}

          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" disabled={saving} onClick={onCancel} className="flex-1 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-40">
              Отмена
            </button>
            <button type="submit" disabled={saving || (requireDeleteWord && confirmation !== 'DELETE')} className="flex-1 rounded-full border border-rose-300/25 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? 'Выполнение…' : confirmLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { createPortal } from 'react-dom'

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

  return createPortal(
    <div
      className="profile-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="profile-modal w-full max-w-md">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-xl text-rose-400" aria-hidden="true">
          !
        </div>
        <h2 id="confirm-title" className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--profile-text-2)' }}>{description}</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {requirePassword && (
            <div>
              <label htmlFor="confirm-current-password" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--profile-text-2)' }}>Текущий пароль</label>
              <input
                id="confirm-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="profile-modal-input"
              />
            </div>
          )}

          {requireDeleteWord && (
            <div>
              <label htmlFor="confirm-delete-word" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--profile-text-2)' }}>Введите DELETE для подтверждения</label>
              <input
                id="confirm-delete-word"
                type="text"
                autoComplete="off"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="profile-modal-input"
              />
            </div>
          )}

          {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" disabled={saving} onClick={onCancel} className="profile-button flex-1">
              Отмена
            </button>
            <button type="submit" disabled={saving || (requireDeleteWord && confirmation !== 'DELETE')} className="profile-danger-button is-strong flex-1">
              {saving ? 'Выполнение…' : confirmLabel}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  )
}

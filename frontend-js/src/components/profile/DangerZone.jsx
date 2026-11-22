import { useState } from 'react'
import ConfirmActionModal from './ConfirmActionModal.jsx'

export default function DangerZone({ onClearHistory, onDeleteAccount, clearing = false, deleting = false }) {
  const [clearOpen, setClearOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <section className="profile-glass-card profile-danger-card">
        <div className="mb-4">
          <p className="profile-danger-kicker">Управление данными</p>
          <h2 className="profile-danger-title">Управление историей и аккаунтом</h2>
          <p className="profile-danger-description">Необратимые действия с историей анализов и учётной записью.</p>
        </div>

        <div className="profile-danger-row">
          <div className="min-w-0">
            <p className="profile-danger-row-title">Очистить историю анализов</p>
            <p className="profile-danger-row-description">Удалит историю, избранное и отзывы, связанные с вашими анализами.</p>
          </div>
          <button type="button" onClick={() => setClearOpen(true)} disabled={clearing || deleting} className="profile-danger-button">
            {clearing ? 'Очистка…' : 'Очистить историю'}
          </button>
        </div>

        <div className="profile-danger-row">
          <div className="min-w-0">
            <p className="profile-danger-row-title">Удалить аккаунт</p>
            <p className="profile-danger-row-description">Аккаунт будет анонимизирован, активные токены отозваны.</p>
          </div>
          <button type="button" onClick={() => setDeleteOpen(true)} disabled={clearing || deleting} className="profile-danger-button is-strong">
            {deleting ? 'Удаление…' : 'Удалить аккаунт'}
          </button>
        </div>
      </section>

      {clearOpen && <ConfirmActionModal
        open={clearOpen}
        title="Очистить историю анализов?"
        description="История анализов будет скрыта без возможности восстановления. Операция затронет только записи вашего аккаунта. Связанные изображения будут удалены в фоновом режиме."
        confirmLabel="Очистить историю"
        saving={clearing}
        onCancel={() => setClearOpen(false)}
        onConfirm={onClearHistory}
      />}

      {deleteOpen && <ConfirmActionModal
        open={deleteOpen}
        title="Удалить аккаунт без возможности восстановления?"
        description="Ваш профиль будет анонимизирован, все сессии отозваны, история скрыта, связанные медиафайлы поставлены в очередь на удаление. Для подтверждения введите текущий пароль и слово DELETE."
        confirmLabel="Удалить аккаунт"
        requirePassword
        requireDeleteWord
        saving={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={onDeleteAccount}
      />}
    </>
  )
}

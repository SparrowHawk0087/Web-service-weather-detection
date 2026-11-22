import { useState } from 'react'
import ConfirmActionModal from './ConfirmActionModal.jsx'

export default function DangerZone({ onClearHistory, onDeleteAccount, clearing = false, deleting = false }) {
  const [clearOpen, setClearOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <section className="rounded-3xl border border-rose-300/15 bg-rose-950/15 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-200/60">Danger zone</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Управление данными</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">Необратимые действия с историей анализов и аккаунтом.</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Очистить историю анализов</p>
              <p className="mt-1 text-xs text-white/40">Удалит историю, избранное и отзывы, связанные с вашими анализами.</p>
            </div>
            <button type="button" onClick={() => setClearOpen(true)} disabled={clearing || deleting} className="shrink-0 rounded-full border border-rose-200/20 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-40">
              {clearing ? 'Очистка…' : 'Очистить историю'}
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-rose-300/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Удалить аккаунт</p>
              <p className="mt-1 text-xs text-white/40">Аккаунт будет анонимизирован, активные токены отозваны.</p>
            </div>
            <button type="button" onClick={() => setDeleteOpen(true)} disabled={clearing || deleting} className="shrink-0 rounded-full bg-rose-500/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
              {deleting ? 'Удаление…' : 'Удалить аккаунт'}
            </button>
          </div>
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

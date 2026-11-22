export default function PreferencesCard({ enabled = true, onChange, saving = false }) {
  return (
    <section className="profile-glass-card p-5 sm:p-6">
      <div className="mb-4">
        <p className="profile-eyebrow">Preferences</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Настройки интерфейса</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/40">Настройки сохраняются в аккаунте и применяются при следующем входе.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Анимации интерфейса</p>
          <p className="mt-1 text-xs text-white/40">{enabled ? 'Переходы и визуальные эффекты включены' : 'Декоративные эффекты отключены'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Анимации интерфейса"
          disabled={saving}
          onClick={() => onChange(!enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-50 ${enabled ? 'border-violet-300/40 bg-violet-500/70' : 'border-white/15 bg-white/10'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Системная настройка «Уменьшение движения» имеет приоритет над этим переключателем.
        {saving ? ' Сохранение…' : ''}
      </p>
    </section>
  )
}

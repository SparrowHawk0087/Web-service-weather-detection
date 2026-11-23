const MODEL_ICONS = {
  'vision-v1': '👁',
  'vision-v2': '✦',
  'storm-detector': 'ϟ',
}

export default function ModelPerformance({ models = [], loading = false }) {
  if (loading) {
    return <section className="profile-glass-card profile-chart-card h-[250px] animate-pulse bg-white/[0.035]" />
  }

  const maxDuration = Math.max(
    1,
    ...models.map((model) => Number(model.avg_response_time_ms || 0)),
  )

  return (
    <section className="profile-glass-card profile-chart-card">
      <div className="profile-section-head">
        <h2 className="profile-section-title">Модели и скорость отклика</h2>
      </div>

      <div className="profile-model-list">
        {models.map((model) => {
          const duration = model.avg_response_time_ms
          const width = duration == null ? 0 : Math.max(4, (duration / maxDuration) * 100)

          return (
            <article key={model.model_id} className="profile-model-row">
              <div className="profile-model-topline">
                <span className="profile-model-icon" aria-hidden="true">
                  {MODEL_ICONS[model.model_id] || '◈'}
                </span>
                <span className="profile-model-name">{model.name}</span>
                <span className="profile-model-time">
                  {duration == null ? '—' : `~${duration} ms`}
                </span>
              </div>
              <div className="profile-model-track" aria-hidden="true">
                <span className="profile-model-fill" style={{ width: `${width}%` }} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

import { useState } from 'react'

const MODELS = [
  { id: 'vision-v1', label: 'Weather Vision v1' },
  { id: 'vision-v2', label: 'Weather Vision v2' },
  { id: 'storm-detector', label: 'Storm Detector' },
];

export default function ModelAccordion({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const selected = MODELS.find((m) => m.id === value) || MODELS[0]

  const handleToggle = () => {
    if (disabled) return
    setOpen((s) => !s)
  }

  const handleSelect = (id) => {
    onChange(id)
    setOpen(false)
  };

  return (
    <div className="w-full">
      {/* button header-accordeon */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3
          px-4 py-3 rounded-2xl
          bg-white/5 border border-white/15
          text-white text-sm
          transition
          ${disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-white/10 cursor-pointer'}
        `}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-white/50 text-xs shrink-0">Model:</span>
          <span className="truncate">{selected.label}</span>
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* list of models */}
      {open && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-[#12131b] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              className={`
                w-full text-left px-4 py-3 text-sm transition
                flex items-center justify-between gap-3
                ${value === m.id
                  ? 'bg-purple-500/15 text-purple-200'
                  : 'text-white/80 hover:bg-white/5'}
              `}
            >
              <span>{m.label}</span>
              {value === m.id && (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
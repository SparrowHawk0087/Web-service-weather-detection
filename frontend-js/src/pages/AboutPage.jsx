import { Link } from 'react-router-dom'
import CloudIcon from '../components/icons/CloudIcon'

const FEATURES = [
  {
    title: 'AI Weather Analysis',
    text: 'Upload photos or archives and let our model detect weather patterns automatically.',
  },
  {
    title: 'Multiple Models',
    text: 'Pick from several detection models depending on your use case and accuracy needs.',
  },
  {
    title: 'History & Pinning',
    text: 'Every analysis is saved. Pin the important ones to keep them always at hand.',
  },
  {
    title: 'Feedback Loop',
    text: 'If the model gets it wrong, tell us — your feedback helps improve accuracy.',
  },
]

const TECH_STACK = [
  { label: 'Frontend', value: 'React + Vite + Tailwind' },
  { label: 'Backend', value: 'Ruby on Rails API' },
  { label: 'Auth', value: 'Token-based (api_token)' },
  { label: 'Storage', value: 'PostgreSQL' },
]

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Layer 1: gradients — replace background from Figma */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              135deg,
              #1e3a5f 0%,
              #16273f 25%,
              #0f1828 55%,
              #0a0d18 80%,
              #06080f 100%
            )
          `,
        }}
      />

      {/* Layer 2: grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      {/* content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-white">

        {/* logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className="text-3xl font-bold tracking-wider">FSR-WEATHER</span>
          <CloudIcon className="text-white" width={44} height={44} />
        </div>

        {/* title and description */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About the Project</h1>
          <p className="text-white/70 leading-relaxed">
            FSR-WEATHER is a web service that detects weather conditions from
            user-uploaded photos. It was built as a learning project to combine
            a modern React frontend with a Ruby on Rails API, covering
            authentication, file uploads, model inference, and a clean user
            dashboard.
          </p>
        </div>

        {/* features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            What it does
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition"
              >
                <h3 className="text-white font-medium mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* tech stack */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Tech Stack
          </h2>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm overflow-hidden">
            {TECH_STACK.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== TECH_STACK.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <span className="text-white/60 text-sm">{row.label}</span>
                <span className="text-white text-sm font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* back button */}
        <div className="flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium hover:brightness-110 active:scale-[0.98] transition"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to dashboard
          </Link>
        </div>

        {/* footer */}
        <p className="text-center text-white/30 text-xs mt-12">
          Built with React, Vite & Rails · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
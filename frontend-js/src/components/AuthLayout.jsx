import CloudIcon from './icons/CloudIcon';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 font-sans">

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

      {/* Violette circle lighting */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5D1D99] blur-[120px]" />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-3 text-white">
        <span className="text-5xl font-bold tracking-wider">FSR-WEATHER</span>
        <CloudIcon className="text-white" width={44} height={44} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-white shadow-[0_0_60px_rgba(168,85,247,0.15)] backdrop-blur-2xl">
        {children}
      </div>
    </div>
  );
}
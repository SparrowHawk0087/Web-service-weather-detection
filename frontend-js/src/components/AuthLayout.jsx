import CloudIcon from './icons/CloudIcon';

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 font-sans">

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
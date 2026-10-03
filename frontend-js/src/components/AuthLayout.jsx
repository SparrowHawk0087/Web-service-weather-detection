import CloudIcon from './icons/CloudIcon';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 text-white">
        <span className="text-3xl font-bold tracking-wider">
          FSR-WEATHER
        </span>
        <CloudIcon className="text-white" width={44} height={44} />
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900/70 border border-purple-500/30 shadow-[0_0_60px_0_rgba(168,85,247,0.35)] p-8">
        {children}
      </div>
    </div>
  );
} 
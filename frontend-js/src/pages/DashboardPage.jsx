import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex bg-[#0a0b10] text-white">

      {/* Left panel - Sidebar */}
      <aside className="w-[280px] shrink-0 bg-black/40 border-r border-white/10 p-4 flex flex-col">
        <div className="text-white/40 text-sm">sidebar (history soon)</div>
      </aside>

      {/* Main area */}
      <main className="relative flex-1 p-6 flex flex-col items-center justify-center">

        {/* Save Result (plug) */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20"
          >
            Save Result
          </button>
        </div>

        {/* Drop zone (plug) */}
        <div className="w-full max-w-2xl h-[400px] rounded-3xl border-2 border-dashed border-white/20 bg-white/[0.03] flex items-center justify-center">
          <span className="text-white/40">drag & drop area</span>
        </div>

        {/* Demo mode (plug) */}
        <button
          type="button"
          className="absolute bottom-6 right-6 w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-200"
        >
          Demo
        </button>
      </main>
    </div>
  );
}
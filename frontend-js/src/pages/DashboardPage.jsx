import { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'

export default function DashboardPage() {
  const [file, setFile] = useState(null)

  const handleNewAnalysis = () => {
    setFile(null)
  }

  return (
    <div className="h-screen flex bg-[#0a0b10] text-white overflow-hidden">
      <Sidebar onNewAnalysis={handleNewAnalysis} />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        {/* Save Result */}
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            disabled={!file}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Save Result
          </button>
        </div>

        <DropZone file={file} onChange={setFile} />

        {/* Demo mode */}
        <button
          type="button"
          className="absolute bottom-6 right-6 w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-200 text-sm hover:bg-purple-500/30 transition"
        >
          Demo
        </button>
      </main>
    </div>
  )
}
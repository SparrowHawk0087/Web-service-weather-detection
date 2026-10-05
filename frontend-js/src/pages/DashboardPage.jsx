import { useState } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'
import FeedbackModal from '../components/dashboard/FeedbackModal'

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const handleNewAnalysis = () => {
    setFile(null)
    setModelId('vision-v1')
  }

  return (
    <div className="h-screen flex bg-[#0a0b10] text-white overflow-hidden">
      <Sidebar onNewAnalysis={handleNewAnalysis} />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            disabled={!file}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Save Result
          </button>
        </div>

        <DropZone
          file={file}
          onChange={setFile}
          modelId={modelId}
          onModelChange={setModelId}
          onReportIssue={() => setFeedbackOpen(true)}
        />

        <button
          type="button"
          className="absolute bottom-6 right-6 w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-200 text-sm hover:bg-purple-500/30 transition"
        >
          Demo
        </button>
      </main>

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        file={file}
      />
    </div>
  )
}
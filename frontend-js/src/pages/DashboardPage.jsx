import { useState, useEffect } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'
import FeedbackModal from '../components/dashboard/FeedbackModal'
import SavePredictionModal from '../components/dashboard/SavePredictionModal'
import {
  analyzeImage,
  savePrediction,
  deletePrediction,
  renamePrediction,
  getPredictions,
} from '../api/auth'

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    loadHistory()
  }, [])

  // При смене файла просто сбрасываем старые результаты
  useEffect(() => {
    setPrediction(null)
    setError(null)
    setSaved(false)
  }, [file])

  const loadHistory = async () => {
    try {
      const response = await getPredictions()
      setHistory(response.predictions || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  // Запуск анализа по кнопке
  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setPrediction(null)
    setError(null)
    setSaved(false)

    try {
      const response = await analyzeImage(file, modelId) // Передаем modelId
      if (response.status === 'success') {
        setPrediction(response.prediction)
      } else {
        setError('Ошибка при обработке изображения')
      }
    } catch (err) {
      console.error('Prediction error:', err)
      setError(err.response?.data?.error || 'Ошибка анализа изображения')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrediction = async (name) => {
    if (!prediction) return
    await savePrediction({ name, prediction, file })
    setSaved(true)
    await loadHistory()
  }

  const handleDeletePrediction = async (id) => {
    try {
      await deletePrediction(id)
      setHistory((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleRenamePrediction = async (id, name) => {
    try {
      await renamePrediction(id, name)
      setHistory((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
    } catch (err) {
      console.error('Rename error:', err)
    }
  }

  const handleNewAnalysis = () => {
    setFile(null)
    setPrediction(null)
    setError(null)
    setSaved(false)
    setModelId('vision-v1')
  }

  return (
    <div className="h-screen flex bg-[#0a0b10] text-white overflow-hidden">
      <Sidebar
        onNewAnalysis={handleNewAnalysis}
        history={history}
        onDelete={handleDeletePrediction}
        onRename={handleRenamePrediction}
      />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={!file || !prediction || loading || saved}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saved ? 'Saved ✓' : 'Save Result'}
          </button>
        </div>

        <DropZone
          file={file}
          onChange={setFile}
          modelId={modelId}
          onModelChange={setModelId}
          onAnalyze={handleAnalyze}
          onReportIssue={() => setFeedbackOpen(true)}
          loading={loading}
          prediction={prediction}
          error={error}
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

      <SavePredictionModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        file={file}
        prediction={prediction}
        onSave={handleSavePrediction}
      />
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'
import FeedbackModal from '../components/dashboard/FeedbackModal'
import HistoryDetailsModal from '../components/dashboard/HistoryDetailsModal'
import {
  enqueuePrediction,
  getPrediction,
  deletePrediction,
  renamePrediction,
  getPredictions,
} from '../api/auth'
import { usePredictionStream } from '../hooks/usePredictionStream'

const STATUS_RANK = {
  pending: 0,
  processing: 1,
  completed: 2,
  failed: 2,
  cancelled: 2,
}

function isIncomingNewer(existing, incoming) {
  if (existing.updated_at && incoming.updated_at) {
    return Date.parse(incoming.updated_at) >= Date.parse(existing.updated_at)
  }

  return (STATUS_RANK[incoming.status] ?? -1) >= (STATUS_RANK[existing.status] ?? -1)
}

function mergePrediction(history, incoming) {
  const index = history.findIndex((item) => item.id === incoming.id)
  if (index === -1) return [incoming, ...history].slice(0, 10)

  const existing = history[index]
  const updated = isIncomingNewer(existing, incoming)
    ? { ...existing, ...incoming }
    : existing

  return history.map((item) => item.id === incoming.id ? updated : item)
}

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [activePredictionId, setActivePredictionId] = useState(null)

  const loadHistory = useCallback(async () => {
    try {
      const response = await getPredictions()
      setHistory((current) => {
        const fetched = response.predictions || []
        const merged = fetched.map((item) => {
          const existing = current.find((entry) => entry.id === item.id)
          if (!existing) return item
          return isIncomingNewer(existing, item) ? { ...existing, ...item } : existing
        })
        const missing = current.filter(
          (item) => !fetched.some((entry) => entry.id === item.id),
        )
        return [...merged, ...missing].slice(0, 10)
      })
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }, [])

  const handlePredictionUpdate = useCallback((updatedPrediction) => {
    setHistory((current) => mergePrediction(current, updatedPrediction))
    setSelectedHistoryItem((current) => (
      current?.id === updatedPrediction.id
        ? { ...current, ...updatedPrediction }
        : current
    ))
  }, [])

  usePredictionStream(handlePredictionUpdate, loadHistory)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (activePredictionId === null) return

    const activePrediction = history.find((item) => item.id === activePredictionId)
    if (!activePrediction) return

    if (activePrediction.status === 'completed') {
      setPrediction(activePrediction)
      setLoading(false)
      setError(null)
    } else if (activePrediction.status === 'failed') {
      setPrediction(null)
      setLoading(false)
      setError(
        activePrediction.error_code
          ? \`Не удалось выполнить анализ (\${activePrediction.error_code}).\`
          : 'Не удалось выполнить анализ изображения.',
      )
    } else {
      setLoading(true)
    }
  }, [history, activePredictionId])

  useEffect(() => {
    setPrediction(null)
    setError(null)
    setActivePredictionId(null)
    setLoading(false)
  }, [file])

  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setPrediction(null)
    setError(null)
    setActivePredictionId(null)

    try {
      const response = await enqueuePrediction(file, modelId, file.name)
      const queuedPrediction = response.prediction

      setActivePredictionId(queuedPrediction.id)
      setHistory((current) => mergePrediction(current, queuedPrediction))

      // A final event can arrive before the browser receives the HTTP 202.
      try {
        const latest = await getPrediction(queuedPrediction.id)
        setHistory((current) => mergePrediction(current, latest.prediction))
      } catch (snapshotError) {
        console.warn('Could not refresh the queued prediction:', snapshotError)
      }
    } catch (err) {
      console.error('Prediction enqueue error:', err)
      setError(err.response?.data?.error || 'Не удалось отправить изображение на анализ')
      setLoading(false)
    }
  }

  const handleDeletePrediction = async (id) => {
    try {
      await deletePrediction(id)
      setHistory((prev) => prev.filter((p) => p.id !== id))
      if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null)
      if (activePredictionId === id) setActivePredictionId(null)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleRenamePrediction = async (id, name) => {
    try {
      await renamePrediction(id, name)
      setHistory((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
      if (selectedHistoryItem?.id === id) {
        setSelectedHistoryItem((prev) => ({ ...prev, name }))
      }
    } catch (err) {
      console.error('Rename error:', err)
    }
  }

  const handleNewAnalysis = () => {
    setFile(null)
    setPrediction(null)
    setError(null)
    setLoading(false)
    setActivePredictionId(null)
    setModelId('vision-v1')
  }

  return (
    <div className="h-screen flex text-white overflow-hidden">
      <Sidebar
        onNewAnalysis={handleNewAnalysis}
        history={history}
        onDelete={handleDeletePrediction}
        onRename={handleRenamePrediction}
        onSelect={setSelectedHistoryItem}
      />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        <div className="absolute top-6 right-6 z-10 text-xs text-white/40">
          Статусы обновляются в реальном времени
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

      <HistoryDetailsModal
        isOpen={!!selectedHistoryItem}
        onClose={() => setSelectedHistoryItem(null)}
        item={selectedHistoryItem}
      />
    </div>
  )
}

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
  addPredictionFavorite,
  removePredictionFavorite,
} from '../api/predictions'
import {
  isIncomingPredictionNewer,
  isPredictionRecord,
  mergePredictionHistory,
  upsertPrediction,
} from '../domain/prediction'
import { usePredictionStream } from '../hooks/usePredictionStream'

const HISTORY_PAGE_SIZE = 20

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [activePredictionId, setActivePredictionId] = useState(null)

  const loadHistory = useCallback(async () => {
    try {
      const response = await getPredictions({ page: 1, perPage: HISTORY_PAGE_SIZE })
      setHistory((current) => mergePredictionHistory(current, response.predictions || []))

      setHistoryTotalCount(response.pagination?.total_count ?? response.predictions?.length ?? 0)
    } catch (error) {
      console.error('Failed to load prediction history:', error)
    }
  }, [])

  const handlePredictionUpdate = useCallback((updatedPrediction) => {
    if (!isPredictionRecord(updatedPrediction)) return

    setHistory((current) => upsertPrediction(current, updatedPrediction, HISTORY_PAGE_SIZE))
    setSelectedHistoryItem((current) => {
      if (current?.id !== updatedPrediction.id) return current
      return isIncomingPredictionNewer(current, updatedPrediction) ? updatedPrediction : current
    })
  }, [])

  usePredictionStream(handlePredictionUpdate, loadHistory)

  // Load one REST snapshot on mount. A snapshot is merged by id and timestamp,
  // so a newer ActionCable event cannot be overwritten by an older HTTP response.
  useEffect(() => {
    let active = true

    getPredictions({ page: 1, perPage: HISTORY_PAGE_SIZE })
      .then((response) => {
        if (active) {
          setHistory((current) => mergePredictionHistory(current, response.predictions || []))

          setHistoryTotalCount(response.pagination?.total_count ?? response.predictions?.length ?? 0)
        }
      })
      .catch((error) => {
        console.error('Failed to load prediction history:', error)
      })

    return () => {
      active = false
    }
  }, [])

  const activePrediction = activePredictionId === null
    ? null
    : history.find((item) => item.id === activePredictionId) || null

  const prediction = activePrediction?.status === 'completed'
    ? activePrediction
    : null

  const isProcessing = ['pending', 'processing'].includes(activePrediction?.status)
  const loading = isSubmitting || isProcessing

  const processingError = activePrediction?.status === 'failed'
    ? activePrediction.error_code
      ? `Не удалось выполнить анализ (${activePrediction.error_code}).`
      : 'Не удалось выполнить анализ изображения.'
    : null

  const error = requestError || processingError

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile)
    setRequestError(null)
    setActivePredictionId(null)
    setIsSubmitting(false)
  }

  const handleAnalyze = async () => {
    if (!file || isSubmitting) return

    setIsSubmitting(true)
    setRequestError(null)
    setActivePredictionId(null)

    try {
      const response = await enqueuePrediction(file, modelId, file.name)
      const queuedPrediction = response?.prediction

      if (!isPredictionRecord(queuedPrediction)) {
        throw new Error('Сервер вернул Prediction в неизвестном формате')
      }

      setActivePredictionId(queuedPrediction.id)
      setHistory((current) => upsertPrediction(current, queuedPrediction, HISTORY_PAGE_SIZE))
      setHistoryTotalCount((current) => current + 1)
      setIsSubmitting(false)

      // Refresh after HTTP 202 to close the race where the final WS event arrives
      // before the browser receives the acceptance response.
      try {
        const latest = await getPrediction(queuedPrediction.id)
        if (isPredictionRecord(latest)) {
          setHistory((current) => upsertPrediction(current, latest, HISTORY_PAGE_SIZE))
        }
      } catch (snapshotError) {
        console.warn('Could not refresh the accepted prediction:', snapshotError)
      }
    } catch (requestError) {
      console.error('Prediction enqueue error:', requestError)
      setRequestError(requestError.message || 'Не удалось отправить изображение на анализ')
      setIsSubmitting(false)
    }
  }

  const handleDeletePrediction = async (id) => {
    try {
      await deletePrediction(id)
      setHistory((current) => current.filter((item) => item.id !== id))
      setHistoryTotalCount((current) => Math.max(0, current - 1))
      if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null)
      if (activePredictionId === id) setActivePredictionId(null)
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось удалить анализ')
      return false
    }
  }

  const handleToggleFavorite = async (item) => {
    try {
      const result = item.is_favorite
        ? await removePredictionFavorite(item.id)
        : await addPredictionFavorite(item.id)
      const updated = { ...item, is_favorite: result.is_favorite }
      setHistory((current) => current.map((record) => record.id === item.id ? updated : record))
      setSelectedHistoryItem((current) => current?.id === item.id ? updated : current)
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось обновить избранное')
      return false
    }
  }

  const handleRenamePrediction = async (id, name) => {
    try {
      await renamePrediction(id, name)
      // PATCH intentionally remains a lightweight legacy response. Re-fetch the
      // canonical object instead of constructing a Prediction in React.
      const refreshedPrediction = await getPrediction(id)
      if (!isPredictionRecord(refreshedPrediction)) {
        throw new Error('Сервер вернул Prediction в неизвестном формате')
      }

      setHistory((current) => upsertPrediction(current, refreshedPrediction, HISTORY_PAGE_SIZE))
      setSelectedHistoryItem((current) => (
        current?.id === id ? refreshedPrediction : current
      ))
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось переименовать анализ')
    }
  }

  const handleNewAnalysis = () => {
    handleFileChange(null)
    setModelId('vision-v1')
  }

  return (
    <div className="h-screen flex text-white overflow-hidden">
      <Sidebar
        onNewAnalysis={handleNewAnalysis}
        history={history}
        historyCount={historyTotalCount}
        activeItemId={selectedHistoryItem?.id}
        onDelete={handleDeletePrediction}
        onRename={handleRenamePrediction}
        onToggleFavorite={handleToggleFavorite}
        onSelect={setSelectedHistoryItem}
      />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        <div className="absolute top-6 right-6 z-10 text-xs text-white/40">
          Статусы обновляются в реальном времени
        </div>

        <DropZone
          file={file}
          onChange={handleFileChange}
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

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'
import FeedbackModal from '../components/dashboard/FeedbackModal'
import HistoryDetailsModal from '../components/dashboard/HistoryDetailsModal'
import {
  enqueuePrediction,
  getPrediction,
  deletePrediction,
  bulkDeletePredictions,
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

function matchesHistoryFilters(item, filters) {
  const query = filters.q?.trim().toLocaleLowerCase('ru')
  if (query) {
    const searchable = [
      item.name,
      item.original_filename,
      item.weather_condition,
      item.weather_code,
      item.ml_model_version,
    ].filter(Boolean).join(' ').toLocaleLowerCase('ru')
    if (!searchable.includes(query)) return false
  }

  if (filters.status) {
    const statuses = String(filters.status).split(',')
    if (!statuses.includes(item.status)) return false
  }
  if (filters.weatherCode && item.weather_code !== filters.weatherCode) return false
  if (filters.favorite === true && item.is_favorite !== true) return false
  if (filters.lowConfidence === true && item.low_confidence !== true) return false
  if (
    typeof filters.minConfidence === 'number'
    && (typeof item.confidence !== 'number' || item.confidence < filters.minConfidence)
  ) return false

  return true
}

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [historyPagination, setHistoryPagination] = useState({
    page: 0,
    total_pages: 0,
    total_count: 0,
  })
  const [historyFilters, setHistoryFilters] = useState({ sort: 'newest' })
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [activePredictionId, setActivePredictionId] = useState(null)

  const historyRef = useRef(history)
  const paginationRef = useRef(historyPagination)
  const filtersRef = useRef(historyFilters)
  const realtimeUpdatesRef = useRef(new Map())
  const requestSequenceRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    paginationRef.current = historyPagination
  }, [historyPagination])

  const loadHistory = useCallback(async ({ append = false } = {}) => {
    if (append && isLoadingMoreRef.current) return false

    const filters = { ...filtersRef.current }
    const page = append ? paginationRef.current.page + 1 : 1
    if (append && page > paginationRef.current.total_pages) return false

    const requestSequence = ++requestSequenceRef.current
    const filterKey = JSON.stringify(filters)

    if (append) {
      isLoadingMoreRef.current = true
      setIsLoadingMore(true)
    } else {
      setIsHistoryLoading(true)
      setHistoryError(null)
    }

    try {
      const response = await getPredictions({
        page,
        perPage: HISTORY_PAGE_SIZE,
        ...filters,
      })

      // Ignore a response that belongs to an older search/filter selection.
      if (
        requestSequence !== requestSequenceRef.current
        || filterKey !== JSON.stringify(filtersRef.current)
      ) return false

      const predictions = response.predictions || []
      const pagination = response.pagination || {
        page,
        total_pages: page,
        total_count: predictions.length,
      }

      if (append) {
        setHistory((current) => mergePredictionHistory(
          current,
          predictions,
          Math.max(HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE),
        ))
      } else {
        const realtimeUpdates = [...realtimeUpdatesRef.current.values()]
          .filter((item) => matchesHistoryFilters(item, filters))
        setHistory(mergePredictionHistory(
          predictions,
          realtimeUpdates,
          HISTORY_PAGE_SIZE,
        ))
      }

      paginationRef.current = pagination
      setHistoryPagination(pagination)
      setHistoryTotalCount(pagination.total_count ?? predictions.length)
      return true
    } catch (error) {
      if (requestSequence === requestSequenceRef.current) {
        if (!append) setHistoryError(error.message || 'Не удалось получить историю анализов')
        else console.error('Failed to load the next history page:', error)
      }
      return false
    } finally {
      if (append) {
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)
      } else if (requestSequence === requestSequenceRef.current) {
        setIsHistoryLoading(false)
      }
    }
  }, [])

  const historyFiltersKey = JSON.stringify(historyFilters)
  useEffect(() => {
    const timer = window.setTimeout(() => loadHistory(), 0)
    return () => window.clearTimeout(timer)
  }, [historyFiltersKey, loadHistory])

  const handlePredictionUpdate = useCallback((updatedPrediction) => {
    if (!isPredictionRecord(updatedPrediction)) return

    realtimeUpdatesRef.current.set(updatedPrediction.id, updatedPrediction)
    const previous = historyRef.current.find((item) => item.id === updatedPrediction.id)
    const isMatching = matchesHistoryFilters(updatedPrediction, filtersRef.current)

    setHistory((current) => {
      if (!isMatching) return current.filter((item) => item.id !== updatedPrediction.id)
      return upsertPrediction(
        current,
        updatedPrediction,
        Math.max(HISTORY_PAGE_SIZE, paginationRef.current.page * HISTORY_PAGE_SIZE),
      )
    })

    if (previous && !isMatching) {
      setHistoryTotalCount((current) => Math.max(0, current - 1))
    } else if (!previous && isMatching) {
      const currentNewest = historyRef.current[0]
      const isNewerThanLoadedWindow = !currentNewest
        || Date.parse(updatedPrediction.created_at) >= Date.parse(currentNewest.created_at)
      if (isNewerThanLoadedWindow) setHistoryTotalCount((current) => current + 1)
    }

    setSelectedHistoryItem((current) => {
      if (current?.id !== updatedPrediction.id) return current
      return isIncomingPredictionNewer(current, updatedPrediction) ? updatedPrediction : current
    })
  }, [])

  usePredictionStream(handlePredictionUpdate, loadHistory)

  const activePrediction = activePredictionId === null
    ? null
    : history.find((item) => item.id === activePredictionId) || null
  const prediction = activePrediction?.status === 'completed' ? activePrediction : null
  const isProcessing = ['pending', 'processing'].includes(activePrediction?.status)
  const loading = isSubmitting || isProcessing

  const processingError = activePrediction?.status === 'failed'
    ? activePrediction.error_code
      ? 'Не удалось выполнить анализ (' + activePrediction.error_code + ').'
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
      realtimeUpdatesRef.current.set(queuedPrediction.id, queuedPrediction)
      if (matchesHistoryFilters(queuedPrediction, filtersRef.current)) {
        setHistory((current) => upsertPrediction(current, queuedPrediction, HISTORY_PAGE_SIZE))
        setHistoryTotalCount((current) => current + 1)
      }
      setIsSubmitting(false)

      // Refresh the canonical record to close the HTTP 202 / WebSocket race.
      try {
        const latest = await getPrediction(queuedPrediction.id)
        if (isPredictionRecord(latest)) {
          realtimeUpdatesRef.current.set(latest.id, latest)
          if (matchesHistoryFilters(latest, filtersRef.current)) {
            setHistory((current) => upsertPrediction(current, latest, HISTORY_PAGE_SIZE))
          }
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
      const existed = historyRef.current.some((item) => item.id === id)
      setHistory((current) => current.filter((item) => item.id !== id))
      if (existed) setHistoryTotalCount((current) => Math.max(0, current - 1))
      if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null)
      if (activePredictionId === id) setActivePredictionId(null)
      realtimeUpdatesRef.current.delete(id)
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось удалить анализ')
      return false
    }
  }

  const handleBulkDelete = async (ids) => {
    try {
      const response = await bulkDeletePredictions(ids)
      const deletedIds = new Set(ids)
      setHistory((current) => current.filter((item) => !deletedIds.has(item.id)))
      setHistoryTotalCount((current) => Math.max(0, current - response.deleted_count))
      if (selectedHistoryItem && deletedIds.has(selectedHistoryItem.id)) setSelectedHistoryItem(null)
      if (activePredictionId !== null && deletedIds.has(activePredictionId)) setActivePredictionId(null)
      ids.forEach((id) => realtimeUpdatesRef.current.delete(id))
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось удалить выбранные записи')
      return false
    }
  }

  const handleToggleFavorite = async (item) => {
    try {
      const result = item.is_favorite
        ? await removePredictionFavorite(item.id)
        : await addPredictionFavorite(item.id)
      const updated = { ...item, is_favorite: result.is_favorite }
      realtimeUpdatesRef.current.set(updated.id, updated)
      const wasMatching = matchesHistoryFilters(item, filtersRef.current)
      const isMatching = matchesHistoryFilters(updated, filtersRef.current)

      setHistory((current) => {
        if (!isMatching) return current.filter((record) => record.id !== item.id)
        return upsertPrediction(current, updated, Math.max(HISTORY_PAGE_SIZE, paginationRef.current.page * HISTORY_PAGE_SIZE))
      })
      if (wasMatching && !isMatching) setHistoryTotalCount((current) => Math.max(0, current - 1))
      else if (!wasMatching && isMatching) setHistoryTotalCount((current) => current + 1)
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
      const previousPrediction = historyRef.current.find((item) => item.id === id)
      const wasMatching = previousPrediction
        ? matchesHistoryFilters(previousPrediction, filtersRef.current)
        : false
      const refreshedPrediction = await getPrediction(id)
      if (!isPredictionRecord(refreshedPrediction)) {
        throw new Error('Сервер вернул Prediction в неизвестном формате')
      }

      realtimeUpdatesRef.current.set(id, refreshedPrediction)
      const matches = matchesHistoryFilters(refreshedPrediction, filtersRef.current)
      setHistory((current) => {
        if (!matches) return current.filter((item) => item.id !== id)
        return upsertPrediction(current, refreshedPrediction, Math.max(HISTORY_PAGE_SIZE, paginationRef.current.page * HISTORY_PAGE_SIZE))
      })
      if (wasMatching && !matches) setHistoryTotalCount((current) => Math.max(0, current - 1))
      else if (!wasMatching && matches) setHistoryTotalCount((current) => current + 1)
      setSelectedHistoryItem((current) => current?.id === id ? refreshedPrediction : current)
      return true
    } catch (error) {
      setRequestError(error.message || 'Не удалось переименовать анализ')
      return false
    }
  }

  const handleNewAnalysis = () => {
    handleFileChange(null)
    setModelId('vision-v1')
  }

  const handleFiltersChange = useCallback((filters) => {
    filtersRef.current = filters
    paginationRef.current = { page: 0, total_pages: 0, total_count: 0 }
    setHistoryFilters(filters)
    setHistory([])
    setHistoryTotalCount(0)
    setHistoryPagination({ page: 0, total_pages: 0, total_count: 0 })
    setHistoryError(null)
  }, [])

  const hasMore = historyPagination.page < historyPagination.total_pages

  return (
    <div className="h-screen flex text-white overflow-hidden">
      <Sidebar
        onNewAnalysis={handleNewAnalysis}
        history={history}
        historyCount={historyTotalCount}
        activeItemId={selectedHistoryItem?.id}
        onDelete={handleDeletePrediction}
        onBulkDelete={handleBulkDelete}
        onRename={handleRenamePrediction}
        onToggleFavorite={handleToggleFavorite}
        onSelect={setSelectedHistoryItem}
        onHistoryFiltersChange={handleFiltersChange}
        onLoadMore={() => loadHistory({ append: true })}
        onRetry={() => loadHistory()}
        hasMore={hasMore}
        isHistoryLoading={isHistoryLoading}
        isLoadingMore={isLoadingMore}
        historyError={historyError}
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

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} file={file} />
      <HistoryDetailsModal
        isOpen={!!selectedHistoryItem}
        onClose={() => setSelectedHistoryItem(null)}
        onToggleFavorite={handleToggleFavorite}
        item={selectedHistoryItem}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import Sidebar from '../components/dashboard/Sidebar'
import DropZone from '../components/dashboard/DropZone'
import FeedbackModal from '../components/dashboard/FeedbackModal'
import { createPrediction, getPredictions } from '../api/auth'

export default function DashboardPage() {
  const [file, setFile] = useState(null)
  const [modelId, setModelId] = useState('vision-v1')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  
  // Новые состояния для предсказаний
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  // Загрузка истории предсказаний
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await getPredictions()
      setHistory(response.predictions || [])
    } catch (err) {
      console.error('Failed to load predictions history:', err)
    }
  }

  // Обработка загрузки файла и отправки на сервер
  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile)
    setPrediction(null)
    setError(null)
    
    if (!selectedFile) return

    setLoading(true)
    
    try {
      const response = await createPrediction(selectedFile)
      
      if (response.status === 'success') {
        setPrediction(response.prediction)
        // Обновляем историю после успешного предсказания
        await loadHistory()
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

  const handleNewAnalysis = () => {
    setFile(null)
    setPrediction(null)
    setError(null)
    setModelId('vision-v1')
  }

  return (
    <div className="h-screen flex bg-[#0a0b10] text-white overflow-hidden">
      <Sidebar 
        onNewAnalysis={handleNewAnalysis} 
        history={history} 
        loading={loading}
      />

      <main className="relative flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            disabled={!file || !prediction}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Save Result
          </button>
        </div>

        {/* Отображение результата предсказания */}
        {prediction && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-green-500/20 border border-green-400/40 rounded-lg p-4 z-10">
            <h3 className="text-green-300 font-bold text-lg mb-2">
              Результат: {prediction.weather_condition}
            </h3>
            <p className="text-green-200">
              Уверенность: {(prediction.confidence * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {/* Отображение ошибки */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-red-500/20 border border-red-400/40 rounded-lg p-4 z-10">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* DropZone с состоянием загрузки */}
        <DropZone
          file={file}
          onChange={handleFileSelect}
          modelId={modelId}
          onModelChange={setModelId}
          onReportIssue={() => setFeedbackOpen(true)}
          loading={loading}
          prediction={prediction}
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
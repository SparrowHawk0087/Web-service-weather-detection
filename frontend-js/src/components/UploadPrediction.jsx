import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPrediction } from '../api/auth'

export default function UploadPrediction() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            // Создаем превью изображения
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result)
            }
            reader.readAsDataURL(selectedFile)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!file) {
            setError('Выберите файл')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await createPrediction(file)
            
            if (response.status === 'success') {
                // Переходим на страницу результата
                navigate('/prediction-result', { 
                    state: { prediction: response.prediction } 
                })
            } else {
                setError('Ошибка при обработке изображения')
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError(err.response?.data?.error || 'Ошибка загрузки файла')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Загрузить изображение для анализа
                </h1>

                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8">
                    {/* Превью изображения */}
                    {preview && (
                        <div className="mb-6">
                            <img 
                                src={preview} 
                                alt="Preview" 
                                className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                            />
                        </div>
                    )}

                    {/* Поле выбора файла */}
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Выберите изображение дороги
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    </div>

                    {/* Ошибки */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Кнопка отправки */}
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg
                            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                            transition-colors duration-200 font-semibold"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Анализ изображения...
                            </span>
                        ) : (
                            'Анализировать'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
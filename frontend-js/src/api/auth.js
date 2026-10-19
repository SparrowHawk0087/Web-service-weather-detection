import axios from 'axios'

const API_URL = 'http://localhost:3000'

const api = axios.create({
    baseURL: API_URL,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Token token=${token}`
    }
    return config
})

export const register = async (userData) => {
    const response = await api.post('/signup', {user: userData})
    return response.data
}

export const login = async (email, password) => {
    const response = await api.post('/login', { email, password })
    return response.data
}

export const logout = async () => {
    await api.delete('/logout')
}

export const getProfile = async () => {
    const response = await api.get('/profile')
    return response.data
}

// Только анализ, без сохранения в историю
export const analyzeImage = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/predictions/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

// Сохранение результата в историю (с названием)
export const savePrediction = async ({ name, prediction, file }) => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('weather_code', prediction.weather_code ?? prediction.class ?? '')
    formData.append('weather_condition', prediction.weather_condition ?? prediction.label ?? '')
    formData.append('confidence', String(prediction.confidence ?? ''))
    if (file) formData.append('image', file)

    const response = await api.post('/predictions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

export const getPredictions = async () => {
    const response = await api.get('/predictions')
    return response.data
}

export const deletePrediction = async (id) => {
    const response = await api.delete(`/predictions/${id}`)
    return response.data
}

export const renamePrediction = async (id, name) => {
    const response = await api.patch(`/predictions/${id}`, { name })
    return response.data
}

export default api
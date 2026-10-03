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

export default api

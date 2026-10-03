import { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    // first render reloads saved data from localStorage
    useEffect(() => {
        const savedToken = localStorage.getItem('token')
        const savedUser = localStorage.getItem('user')

        if (!savedToken) {
            setLoading(false)
            return
        }

        setToken(savedToken)
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser))
            } catch (e) {
            console.log('Could not read user from localStorage', e)
            }
        }

        // Checking token on server for dividing expired
        authApi
            .getProfile()
            .then((data) => {
            setUser(data)
            localStorage.setItem('user', JSON.stringify(data))
            })
            .catch((err) => {
                console.log('>>> the token failed verification:', err.response?.status)
                if (err.response?.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    setToken(null)
                    setUser(null)
                }
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    const login = async (email, password) => {
        const data = await authApi.login(email, password)
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setToken(data.token)
        setUser(data.user)
        return data
    }

    const register = async (userData) => {
        const data = await authApi.register(userData)
        localStorage.setItem('token', data.token)

        const userObj = data.user

        localStorage.setItem('user', JSON.stringify(userObj))
        setToken(data.token)
        setUser(userObj)
        return data
    }

    const logout = async (silent = false) => {
        if (!silent) {
            try {
                await authApi.logout() 
            } catch (err) {
                console.log(">>> logout error:", err)
            }
        } 
        
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        setUser
    }
    return <AuthContext.Provider value={ value }>{ children }</AuthContext.Provider>
}


export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error("useAuth should be used inside AuthProvider")
    }
    return ctx
}
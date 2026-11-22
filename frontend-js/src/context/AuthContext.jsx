import { useEffect, useState } from 'react'
import * as authApi from '../api/auth.js'
import AuthContext from './auth-context.js'

function readSavedUser() {
  const savedUser = localStorage.getItem('user')
  if (!savedUser) return null

  try {
    return JSON.parse(savedUser)
  } catch (error) {
    console.warn('Could not read user from localStorage:', error)
    localStorage.removeItem('user')
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  useEffect(() => {
    if (!token) return undefined

    let active = true

    authApi
      .getProfile()
      .then((data) => {
        if (!active) return
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data))
      })
      .catch((error) => {
        if (!active) return
        console.warn('The saved token could not be verified:', error.status)

        if (error.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('token', data.api_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.api_token)
    setUser(data.user)
    return data
  }

  const register = async (userData) => {
    const data = await authApi.register(userData)
    localStorage.setItem('token', data.api_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.api_token)
    setUser(data.user)
    return data
  }

  const logout = async (silent = false) => {
    if (!silent) {
      try {
        await authApi.logout()
      } catch (error) {
        console.warn('Logout request failed:', error)
      }
    }

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setLoading(false)
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

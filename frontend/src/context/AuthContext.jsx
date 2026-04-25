import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ct_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { access_token, username: uname, must_change_password } = res.data
    localStorage.setItem('ct_token', access_token)
    const userData = { username: uname, must_change_password }
    localStorage.setItem('ct_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const changePassword = useCallback(async (newPassword) => {
    await api.post('/auth/change-password', { new_password: newPassword })
    const updated = { ...user, must_change_password: false }
    localStorage.setItem('ct_user', JSON.stringify(updated))
    setUser(updated)
  }, [user])

  const logout = useCallback(() => {
    localStorage.removeItem('ct_token')
    localStorage.removeItem('ct_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

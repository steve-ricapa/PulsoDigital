import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'

interface User {
  id: string
  email: string
  full_name: string
  role: 'psychologist' | 'student'
  is_active: boolean
  is_verified: boolean
  school_id?: string
  student_profile?: { id: string; internal_id: string }
  psychologist_profile?: { id: string }
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, login, logout, refreshAccessToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated && user) {
        try {
          await refreshAccessToken()
        } catch {
          logout()
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

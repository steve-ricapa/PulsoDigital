import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../lib/api'

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

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isDemo: boolean
  isRefreshing: boolean
  login: (email: string, password: string) => Promise<void>
  loginDemo: (role: User['role']) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  refreshAccessToken: () => Promise<void>
}

const DEMO_USERS: Record<User['role'], User> = {
  student: {
    id: 'demo-student-001',
    email: 'estudiante@colegio.edu',
    full_name: 'María García López',
    role: 'student',
    is_active: true,
    is_verified: true,
    school_id: 'school-001',
    student_profile: { id: 'sp-001', internal_id: 'EST-2024-001' },
  },
  psychologist: {
    id: 'demo-psych-001',
    email: 'psicologo@colegio.edu',
    full_name: 'Dr. Carlos Mendoza',
    role: 'psychologist',
    is_active: true,
    is_verified: true,
    school_id: 'school-001',
    psychologist_profile: { id: 'pp-001' },
  },
}

let refreshPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isDemo: false,
      isRefreshing: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password })
        const { token, user } = response.data

        set({
          user,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          isAuthenticated: true,
          isDemo: false,
        })
      },

      loginDemo: (role: User['role']) => {
        const user = DEMO_USERS[role]
        set({
          user,
          accessToken: 'demo-token',
          refreshToken: null,
          isAuthenticated: true,
          isDemo: true,
        })
      },

      logout: async () => {
        const { accessToken, isDemo } = get()
        if (!isDemo && accessToken) {
          try {
            await api.post('/auth/logout')
          } catch {
            // ignore — token may already be expired
          }
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isDemo: false,
          isRefreshing: false,
        })
      },

      setUser: (user: User) => set({ user }),

      refreshAccessToken: async () => {
        const { refreshToken, isDemo } = get()
        if (isDemo || !refreshToken) return

        if (refreshPromise) {
          return refreshPromise
        }

        refreshPromise = (async () => {
          set({ isRefreshing: true })
          try {
            const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
            const { access_token, refresh_token } = response.data
            set({
              accessToken: access_token,
              refreshToken: refresh_token,
              isRefreshing: false,
            })
          } catch {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isRefreshing: false,
            })
          } finally {
            refreshPromise = null
          }
        })()

        return refreshPromise
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isDemo: state.isDemo,
      }),
    }
  )
)

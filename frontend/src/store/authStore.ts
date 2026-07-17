import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'school_admin' | 'psychologist' | 'student'
  is_active: boolean
  is_verified: boolean
  school_id?: string
  student_profile?: { id: string; internal_id: string }
  psychologist_profile?: { id: string }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isDemo: boolean
  login: (email: string, password: string) => Promise<void>
  loginDemo: (role: User['role']) => void
  logout: () => void
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
  school_admin: {
    id: 'demo-admin-001',
    email: 'admin@colegio.edu',
    full_name: 'Lic. Ana Torres',
    role: 'school_admin',
    is_active: true,
    is_verified: true,
    school_id: 'school-001',
  },
  admin: {
    id: 'demo-sysadmin-001',
    email: 'superadmin@pulsodigital.edu',
    full_name: 'Ing. Roberto Díaz',
    role: 'admin',
    is_active: true,
    is_verified: true,
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isDemo: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password })
        const { access_token, user } = response.data
        
        set({
          user,
          accessToken: access_token,
          isAuthenticated: true,
          isDemo: false,
        })
        
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      },

      loginDemo: (role: User['role']) => {
        const user = DEMO_USERS[role]
        set({
          user,
          accessToken: 'demo-token',
          isAuthenticated: true,
          isDemo: true,
        })
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false, isDemo: false })
        delete api.defaults.headers.common['Authorization']
      },

      setUser: (user: User) => set({ user }),

      refreshAccessToken: async () => {
        const { accessToken } = get()
        if (accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isDemo: state.isDemo,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`
        }
      },
    }
  )
)
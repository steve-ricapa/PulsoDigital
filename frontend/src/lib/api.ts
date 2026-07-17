import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use(
  (config) => {
    const { accessToken, isDemo } = useAuthStore.getState()
    if (isDemo) {
      const url = config.url || ''
      const fullUrl = (config.baseURL || '') + url
      const params = config.params
      let paramStr = ''
      if (params) {
        const qs = new URLSearchParams()
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)) })
        paramStr = qs.toString()
      }
      const mockUrl = paramStr ? `${fullUrl}?${paramStr}` : fullUrl
      const mockData = getMockData(mockUrl)
      config.adapter = () => Promise.resolve({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    } else if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

function processQueue(error: unknown) {
  failedQueue.forEach(({ reject }) => reject(error))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const { isDemo, refreshToken, isAuthenticated } = useAuthStore.getState()

    if (isDemo) {
      const url = error.config?.url || ''
      return Promise.resolve({ data: getMockData(url), status: 200, statusText: 'OK', headers: {}, config: error.config })
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isDemo && isAuthenticated) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      if (!refreshToken) {
        isRefreshing = false
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      try {
        await useAuthStore.getState().refreshAccessToken()
        const { accessToken } = useAuthStore.getState()
        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          processQueue(null)
          return api(originalRequest)
        }
        processQueue(error)
        return Promise.reject(error)
      } catch (refreshError) {
        processQueue(refreshError)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function getMockData(url: string): unknown {
  if (url.includes('/dashboard/psychologist')) {
    return {
      assigned_classrooms: [
        { classroom_id: 'c1', classroom_name: '1ro A', grade: 1, section: 'A', total_students: 28, avg_wellbeing: 0.72, risk_distribution: { low: 20, medium: 6, high: 2 }, completion_rate: 0.89 },
        { classroom_id: 'c2', classroom_name: '2do B', grade: 2, section: 'B', total_students: 30, avg_wellbeing: 0.65, risk_distribution: { low: 15, medium: 10, high: 5 }, completion_rate: 0.93 },
        { classroom_id: 'c3', classroom_name: '3ro A', grade: 3, section: 'A', total_students: 26, avg_wellbeing: 0.78, risk_distribution: { low: 22, medium: 3, high: 1 }, completion_rate: 0.96 },
      ],
      priority_students: [
        { student_id: 's1', internal_id: 'EST-042', classroom: '2do B', wellbeing_score: 0.31, risk_level: 'high', trend: 'declining', weeks_declining: 3, sudden_drop: true, last_survey_date: '2025-07-07' },
        { student_id: 's2', internal_id: 'EST-108', classroom: '1ro A', wellbeing_score: 0.38, risk_level: 'high', trend: 'declining', weeks_declining: 4, sudden_drop: false, last_survey_date: '2025-07-07' },
        { student_id: 's3', internal_id: 'EST-075', classroom: '2do B', wellbeing_score: 0.45, risk_level: 'medium', trend: 'declining', weeks_declining: 2, sudden_drop: false, last_survey_date: '2025-07-07' },
      ],
      pending_requests: 3,
      upcoming_followups: [
        { intervention_id: 'i1', student_internal_id: 'EST-042', type: 'contact_made', follow_up_date: '2025-07-14' },
        { intervention_id: 'i2', student_internal_id: 'EST-108', type: 'referral', follow_up_date: '2025-07-11' },
      ],
    }
  }

  if (url.includes('/dashboard/students') && !url.includes('/trend') && !url.includes('/detail')) {
    const allStudents = [
      { id: 'mock-001', internal_id: 'EST-2026-001', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.84, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-002', internal_id: 'EST-2026-002', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.34, risk_level: 'high', trend: 'declining', weeks_declining: 3, sudden_drop: true, last_survey_date: '2026-07-15', pending_requests: 1 },
      { id: 'mock-003', internal_id: 'EST-2026-003', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.67, risk_level: 'moderate', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-004', internal_id: 'EST-2026-004', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.72, risk_level: 'low', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-005', internal_id: 'EST-2026-005', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.41, risk_level: 'high', trend: 'declining', weeks_declining: 4, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 2 },
      { id: 'mock-006', internal_id: 'EST-2026-006', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.88, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-007', internal_id: 'EST-2026-007', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.55, risk_level: 'moderate', trend: 'declining', weeks_declining: 2, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-008', internal_id: 'EST-2026-008', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.91, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-009', internal_id: 'EST-2026-009', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.48, risk_level: 'moderate', trend: 'declining', weeks_declining: 2, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 1 },
      { id: 'mock-010', internal_id: 'EST-2026-010', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.76, risk_level: 'low', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-15', pending_requests: 0 },
      { id: 'mock-011', internal_id: 'EST-2026-011', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.62, risk_level: 'moderate', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-14', pending_requests: 0 },
      { id: 'mock-012', internal_id: 'EST-2026-012', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.38, risk_level: 'high', trend: 'declining', weeks_declining: 5, sudden_drop: true, last_survey_date: '2026-07-14', pending_requests: 1 },
      { id: 'mock-013', internal_id: 'EST-2026-013', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.82, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-14', pending_requests: 0 },
      { id: 'mock-014', internal_id: 'EST-2026-014', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.71, risk_level: 'low', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-14', pending_requests: 0 },
      { id: 'mock-015', internal_id: 'EST-2026-015', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.53, risk_level: 'moderate', trend: 'declining', weeks_declining: 1, sudden_drop: false, last_survey_date: '2026-07-14', pending_requests: 0 },
      { id: 'mock-016', internal_id: 'EST-2026-016', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.44, risk_level: 'high', trend: 'declining', weeks_declining: 3, sudden_drop: false, last_survey_date: '2026-07-13', pending_requests: 1 },
      { id: 'mock-017', internal_id: 'EST-2026-017', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.79, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-13', pending_requests: 0 },
      { id: 'mock-018', internal_id: 'EST-2026-018', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.65, risk_level: 'moderate', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-13', pending_requests: 0 },
      { id: 'mock-019', internal_id: 'EST-2026-019', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.87, risk_level: 'low', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-13', pending_requests: 0 },
      { id: 'mock-020', internal_id: 'EST-2026-020', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.58, risk_level: 'moderate', trend: 'declining', weeks_declining: 2, sudden_drop: false, last_survey_date: '2026-07-12', pending_requests: 0 },
      { id: 'mock-021', internal_id: 'EST-2026-021', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.73, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-12', pending_requests: 0 },
      { id: 'mock-022', internal_id: 'EST-2026-022', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.47, risk_level: 'moderate', trend: 'declining', weeks_declining: 2, sudden_drop: false, last_survey_date: '2026-07-12', pending_requests: 0 },
      { id: 'mock-023', internal_id: 'EST-2026-023', classroom_name: '1ro A', grade: 1, section: 'A', latest_wellbeing: 0.92, risk_level: 'low', trend: 'improving', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-11', pending_requests: 0 },
      { id: 'mock-024', internal_id: 'EST-2026-024', classroom_name: '2do B', grade: 2, section: 'B', latest_wellbeing: 0.36, risk_level: 'high', trend: 'sudden_drop', weeks_declining: 0, sudden_drop: true, last_survey_date: '2026-07-11', pending_requests: 2 },
      { id: 'mock-025', internal_id: 'EST-2026-025', classroom_name: '3ro A', grade: 3, section: 'A', latest_wellbeing: 0.69, risk_level: 'low', trend: 'stable', weeks_declining: 0, sudden_drop: false, last_survey_date: '2026-07-11', pending_requests: 0 },
    ]
    let filtered = allStudents
    const searchMatch = url.match(/[?&]search=([^&]*)/)
    if (searchMatch?.[1]) {
      const q = searchMatch[1].toLowerCase()
      filtered = filtered.filter(s => s.internal_id.toLowerCase().includes(q))
    }
    const riskMatch = url.match(/[?&]risk_level=([^&]*)/)
    if (riskMatch?.[1]) {
      filtered = filtered.filter(s => s.risk_level === riskMatch[1])
    }
    const pageMatch = url.match(/[?&]page=(\d+)/)
    const page = pageMatch ? parseInt(pageMatch[1]) : 1
    const pageSize = 20
    const start = (page - 1) * pageSize
    return {
      students: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      size: pageSize,
      pages: Math.ceil(filtered.length / pageSize),
    }
  }

  if (url.includes('/dashboard/students/') && (url.includes('/trend') || url.includes('/detail'))) {
    const weeks = 8
    const history = Array.from({ length: weeks }, (_, i) => {
      const base = 0.5 + Math.random() * 0.3
      const declining = url.includes('s1') ? -i * 0.04 : 0
      return {
        date: new Date(Date.now() - (weeks - 1 - i) * 7 * 86400000).toISOString().split('T')[0],
        overall: Math.max(0.1, Math.min(1, base + declining)),
        emotional: Math.max(0.1, Math.min(1, base + 0.05 + declining)),
        safety: Math.max(0.1, Math.min(1, base - 0.03 + declining * 0.5)),
        belonging: Math.max(0.1, Math.min(1, base + 0.02 + declining * 0.8)),
        risk_level: base + declining < 0.4 ? 'high' : base + declining < 0.6 ? 'medium' : 'low',
      }
    })
    return {
      id: 's1', internal_id: 'EST-042', classroom_name: '2do B', grade: 2, section: 'B',
      wellbeing_history: history,
      support_requests: [
        { id: 'sr1', request_type: 'i_want_to_talk', message: 'Me siento triste últimamente', is_anonymous: false, status: 'pending', created_at: '2025-07-08T10:30:00' },
      ],
      interventions: [
        { id: 'i1', intervention_type: 'conversation', description: 'Se realizó llamada de seguimiento. Estudiante refiere sentirse mejor.', follow_up_date: '2025-07-14', is_completed: false, created_at: '2025-07-07T14:00:00', psychologist_name: 'Dr. Carlos Mendoza' },
      ],
    }
  }

  if (url.includes('/risk/alerts')) {
    return {
      alerts: [
        { student_id: 's1', student_internal_id: 'EST-042', classroom_name: '2do B', risk_level: 'high', risk_probability: 0.78, trend: 'declining', weeks_declining: 3, sudden_drop: true, last_survey_date: '2025-07-07', recommended_action: 'Seguimiento prioritario recomendado' },
        { student_id: 's2', student_internal_id: 'EST-108', classroom_name: '1ro A', risk_level: 'high', risk_probability: 0.72, trend: 'declining', weeks_declining: 4, sudden_drop: false, last_survey_date: '2025-07-07', recommended_action: 'Revisar evolución y contactar apoderado' },
      ],
      total: 2, page: 1, size: 20, pages: 1,
    }
  }

  if (url.includes('/interventions') && !url.includes('/student/')) {
    return {
      interventions: [
        { id: 'i1', student_id: 's1', student_internal_id: 'EST-042', classroom_name: '2do B', intervention_type: 'conversation', description: 'Llamada de seguimiento con estudiante', follow_up_date: '2025-07-14', is_completed: false, created_at: '2025-07-07T14:00:00', psychologist_name: 'Dr. Carlos Mendoza', risk_level: 'high' },
        { id: 'i2', student_id: 's2', student_internal_id: 'EST-108', classroom_name: '1ro A', intervention_type: 'external_referral', description: 'Derivación a orientación vocacional', is_completed: true, completed_at: '2025-07-05T16:00:00', created_at: '2025-07-01T09:00:00', psychologist_name: 'Dr. Carlos Mendoza', risk_level: 'medium' },
      ],
      total: 2, page: 1, size: 20, pages: 1,
    }
  }

  if (url.includes('/surveys/current')) {
    return {
      id: 'survey-001',
      name: 'Check-in Semanal - Semana 28',
      questions: [
        { id: 'q1', text: '¿Cómo te sientes hoy?', question_type: 'emoji_scale', order: 1, category: 'emotional' },
        { id: 'q2', text: '¿Te sientes seguro/a en el colegio?', question_type: 'emoji_scale', order: 2, category: 'safety' },
        { id: 'q3', text: '¿Sientes que perteneces a tu comunidad escolar?', question_type: 'emoji_scale', order: 3, category: 'belonging' },
        { id: 'q4', text: 'En una escala del 1 al 10, ¿cómo calificarías tu semana?', question_type: 'slider', order: 4, category: 'emotional', min_value: 1, max_value: 10 },
        { id: 'q5', text: '¿Hay algo que quieras contarnos?', question_type: 'open_text', order: 5, category: 'general', is_required: false },
      ],
    }
  }

  if (url.includes('/wellbeing') && url.includes('/student/')) {
    return {
      overall: 0.72,
      emotional: 0.75,
      safety: 0.68,
      belonging: 0.74,
      risk_level: 'low',
      survey_date: '2025-07-07',
    }
  }

  if (url.includes('/wellbeing/trend/')) {
    return {
      trend: Array.from({ length: 8 }, (_, i) => ({
        date: new Date(Date.now() - (7 - i) * 7 * 86400000).toISOString().split('T')[0],
        overall: 0.6 + Math.random() * 0.25,
        emotional: 0.65 + Math.random() * 0.2,
        safety: 0.55 + Math.random() * 0.3,
        belonging: 0.6 + Math.random() * 0.25,
        risk_level: 'low',
      })),
    }
  }

  if (url.includes('/support-requests')) {
    return { id: 'sr-new', status: 'pending', message: 'Solicitud recibida' }
  }

  if (url.includes('/responses/quick/calendar')) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const completions: string[] = []
    for (let d = 1; d <= now.getDate(); d++) {
      const dt = new Date(year, month - 1, d)
      if (dt.getDay() === 0 || dt.getDay() === 6) continue
      if (Math.random() < 0.25) continue
      completions.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return { completions, total: completions.length, month, year }
  }

  if (url.includes('/responses/quick')) {
    return { id: 'qr-new', status: 'saved', message: 'Check-in diario registrado' }
  }

  return {}
}

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
}

export const studentApi = {
  getCurrentSurvey: () => api.get('/surveys/current'),
  submitResponses: (data: { survey_id: string; responses: Array<{ question_id: string; value_numeric?: number; value_text?: string }> }) =>
    api.post('/responses/bulk', data),
  getWellbeing: (studentId: string) => api.get(`/wellbeing/student/${studentId}/latest`),
  getTrend: (studentId: string, weeks?: number) =>
    api.get(`/wellbeing/trend/${studentId}`, { params: { weeks } }),
  createSupportRequest: (data: { request_type: string; message?: string; is_anonymous: boolean }) =>
    api.post('/support-requests', data),
}

export const psychologistApi = {
  getDashboard: () => api.get('/dashboard/psychologist'),
  getClassrooms: () => api.get('/dashboard/classrooms'),
  getStudents: (params?: { classroom_id?: string; risk_level?: string; page?: number; size?: number }) =>
    api.get('/dashboard/students', { params }),
  getStudentDetail: (studentId: string, weeks?: number) =>
    api.get(`/dashboard/students/${studentId}/detail`, { params: { weeks } }),
  getAlerts: (params?: { risk_level?: string; page?: number; size?: number }) =>
    api.get('/risk/alerts', { params }),
  createIntervention: (data: {
    student_id: string
    intervention_type: string
    description: string
    follow_up_date?: string
  }) => api.post('/interventions', data),
  updateIntervention: (id: string, data: Partial<{
    intervention_type: string
    description: string
    outcome: string
    follow_up_date: string
    is_completed: boolean
  }>) => api.patch(`/interventions/${id}`, data),
  getInterventions: (params?: { student_id?: string; page?: number; size?: number }) =>
    api.get('/interventions', { params }),
  getStudentInterventions: (studentId: string) =>
    api.get(`/interventions/student/${studentId}/history`),
}

export const surveyApi = {
  list: (params?: { school_id?: string; status?: string; page?: number; size?: number }) =>
    api.get('/surveys', { params }),
  get: (id: string) => api.get(`/surveys/${id}`),
  create: (data: {
    school_id: string
    name: string
    description?: string
    start_date: string
    end_date: string
    frequency_weeks: number
    is_anonymous: boolean
  }) => api.post('/surveys', data),
  update: (id: string, data: Partial<{
    name: string
    description: string
    status: string
    start_date: string
    end_date: string
  }>) => api.patch(`/surveys/${id}`, data),
  addQuestion: (surveyId: string, data: {
    text: string
    question_type: string
    order: number
    category: string
    options?: string
    min_value?: number
    max_value?: number
    is_required: boolean
  }) => api.post(`/surveys/${surveyId}/questions`, data),
  updateQuestion: (surveyId: string, questionId: string, data: Partial<{
    text: string
    question_type: string
    order: number
    category: string
    options: string
    min_value: number
    max_value: number
    is_required: boolean
    is_active: boolean
  }>) => api.patch(`/surveys/${surveyId}/questions/${questionId}`, data),
}

export const wellbeingApi = {
  calculate: (studentId: string, surveyId: string) =>
    api.post(`/wellbeing/calculate/${studentId}/${surveyId}`),
  bulkCalculate: (surveyId: string, classroomId?: string) =>
    api.post('/wellbeing/calculate-bulk', { survey_id: surveyId, classroom_id: classroomId }),
  list: (params?: {
    student_id?: string
    survey_id?: string
    risk_level?: string
    page?: number
    size?: number
  }) => api.get('/wellbeing', { params }),
  getLatest: (studentId: string, surveyId: string) =>
    api.get(`/wellbeing/student/${studentId}/${surveyId}`),
}

export const riskApi = {
  predict: (studentId: string, surveyId: string) =>
    api.post(`/risk/predict/${studentId}/${surveyId}`),
  getAlerts: (params?: { school_id?: string; risk_level?: string; page?: number; size?: number }) =>
    api.get('/risk/alerts', { params }),
  getPrediction: (studentId: string, surveyId: string) =>
    api.get(`/risk/predictions/${studentId}/${surveyId}`),
}

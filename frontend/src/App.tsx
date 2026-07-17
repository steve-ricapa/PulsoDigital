import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { StudentLayout } from './layouts/StudentLayout'
import { PsychologistLayout } from './layouts/PsychologistLayout'
import { StudentDashboard } from './student/pages/StudentDashboard'
import { StudentCheckIn } from './student/pages/StudentCheckin'
import { StudentSupport } from './student/pages/StudentSupport'
import { Chatbot as StudentChat } from './student/components/Chatbot'
import { PsychologistDashboard } from './psychologist/pages/PsychologistDashboard'
import { PsychologistStudents } from './psychologist/pages/PsychologistStudents'
import { PsychologistStudentDetail } from './psychologist/pages/PsychologistStudentDetail'
import { PsychologistInterventions } from './psychologist/pages/PsychologistInterventions'
import { PsychologistAlerts } from './psychologist/pages/PsychologistAlerts'
import { useAuthStore } from './store/authStore'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    const { user } = useAuthStore.getState()
    if (user?.role === 'student') return <Navigate to="/pulso" replace />
    return <Navigate to="/psicologo/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route element={
          <ProtectedRoute roles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }>
          <Route path="/pulso" element={<StudentDashboard />} />
          <Route path="/pulso/checkin" element={<StudentCheckIn />} />
          <Route path="/pulso/chat" element={<StudentChat />} />
          <Route path="/ayuda" element={<StudentSupport />} />
        </Route>

        <Route element={
          <ProtectedRoute roles={['psychologist']}>
            <PsychologistLayout />
          </ProtectedRoute>
        }>
          <Route path="/psicologo/dashboard" element={<PsychologistDashboard />} />
          <Route path="/psicologo/estudiantes" element={<PsychologistStudents />} />
          <Route path="/psicologo/estudiantes/:id" element={<PsychologistStudentDetail />} />
          <Route path="/psicologo/intervenciones" element={<PsychologistInterventions />} />
          <Route path="/psicologo/alertas" element={<PsychologistAlerts />} />
        </Route>

        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="card p-8 text-center max-w-md">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso no autorizado</h1>
              <p className="text-gray-600 mb-6">No tienes permisos para acceder a esta sección.</p>
              <a href="/login" className="btn-primary inline-block">Volver al inicio</a>
            </div>
          </div>
        } />

        <Route path="/" element={<Navigate to="/pulso" replace />} />
        <Route path="*" element={<Navigate to="/pulso" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default AppRoutes

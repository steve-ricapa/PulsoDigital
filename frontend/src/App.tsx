import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/auth/Login'
import { StudentLayout } from './layouts/StudentLayout'
import { PsychologistLayout } from './layouts/PsychologistLayout'
import { StudentDashboard } from './student/pages/StudentDashboard'
import { StudentCheckIn } from './student/pages/StudentCheckin'
import { StudentHistory } from './student/pages/StudentHistory'
import { StudentSupport } from './student/pages/StudentSupport'
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
    if (user?.role === 'psychologist') return <Navigate to="/psicologo/dashboard" replace />
    return <Navigate to="/dashboard" replace />
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
          <Route path="/pulso/historial" element={<StudentHistory />} />
          <Route path="/ayuda" element={<StudentSupport />} />
        </Route>

        <Route element={
          <ProtectedRoute roles={['psychologist', 'admin', 'school_admin']}>
            <PsychologistLayout />
          </ProtectedRoute>
        }>
          <Route path="/psicologo/dashboard" element={<PsychologistDashboard />} />
          <Route path="/psicologo/estudiantes" element={<PsychologistStudents />} />
          <Route path="/psicologo/estudiantes/:id" element={<PsychologistStudentDetail />} />
          <Route path="/psicologo/intervenciones" element={<PsychologistInterventions />} />
          <Route path="/psicologo/alertas" element={<PsychologistAlerts />} />
        </Route>

        <Route path="/" element={<Navigate to="/pulso" replace />} />
        <Route path="*" element={<Navigate to="/pulso" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default AppRoutes

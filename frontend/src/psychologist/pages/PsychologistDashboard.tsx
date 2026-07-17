import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { TrendingUp, AlertTriangle, Clock, AlertCircle, Calendar, Users } from 'lucide-react'

interface ClassroomSummary {
  classroom_id: string
  classroom_name: string
  grade: number
  section: string
  total_students: number
  avg_wellbeing: number
  risk_distribution: Record<string, number>
  completion_rate: number
}

interface PriorityStudent {
  student_id: string
  internal_id: string
  classroom: string
  wellbeing_score: number
  risk_level: string
  trend: string
  weeks_declining: number
  sudden_drop: boolean
  last_survey_date: string
}

interface PsychologistDashboardData {
  assigned_classrooms: ClassroomSummary[]
  priority_students: PriorityStudent[]
  pending_requests: number
  upcoming_followups: Array<{
    intervention_id: string
    student_internal_id: string
    type: string
    follow_up_date: string
  }>
}

export function PsychologistDashboard() {
  const [data, setData] = useState<PsychologistDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/dashboard/psychologist')
        setData(res.data)
      } catch {
        console.error('Failed to fetch dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div><div className="h-12 bg-gray-200 rounded w-1/3"></div></div>)}
        </div>
        <div className="card p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div><div className="h-72 bg-gray-200 rounded"></div></div>
      </div>
    )
  }

  const totalStudents = data?.assigned_classrooms.reduce((sum, c) => sum + c.total_students, 0) || 0
  const avgWellbeing = data?.assigned_classrooms.length
    ? Math.round(data.assigned_classrooms.reduce((sum, c) => sum + c.avg_wellbeing, 0) / data.assigned_classrooms.length * 100)
    : 0

  const riskCounts = data?.assigned_classrooms.reduce((acc, c) => {
    Object.entries(c.risk_distribution).forEach(([level, count]) => {
      acc[level] = (acc[level] || 0) + count
    })
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen de tus aulas asignadas</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Estudiantes</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bienestar Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{avgWellbeing}%</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alertas Prioritarias</p>
              <p className="text-2xl font-bold text-gray-900">{data?.priority_students.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{data?.pending_requests || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Aulas a tu Cargo</h2>
            <span className="text-sm text-gray-500">{data?.assigned_classrooms.length || 0} aulas</span>
          </div>
          <div className="space-y-3">
            {data?.assigned_classrooms.map((classroom) => (
              <div key={classroom.classroom_id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-lg">{classroom.grade}°{classroom.section}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{classroom.classroom_name}</p>
                      <p className="text-sm text-gray-600">{classroom.total_students} estudiantes • {Math.round(classroom.avg_wellbeing * 100)}% bienestar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={cn('badge', getRiskLevelColor('critical'))}>{riskCounts.critical || 0} Críticos</span>
                    <span className={cn('badge', getRiskLevelColor('high'))}>{riskCounts.high || 0} Altos</span>
                    <span className={cn('badge', getRiskLevelColor('moderate'))}>{riskCounts.moderate || 0} Moderados</span>
                    <span className={cn('badge', getRiskLevelColor('low'))}>{riskCounts.low || 0} Bajos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Estudiantes Prioritarios
              </h2>
            </div>
            {data?.priority_students.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay alertas prioritarias</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data?.priority_students.slice(0, 10).map((student) => (
                  <div key={student.student_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{student.internal_id}</span>
                          <span className={cn('badge', getRiskLevelColor(student.risk_level))}>
                            {getRiskLevelLabel(student.risk_level)}
                          </span>
                          {student.sudden_drop && (
                            <span className="badge bg-red-100 text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Caída brusca
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{student.classroom} • {student.weeks_declining} sem. bajando</p>
                        <p className="text-xs text-gray-500">Bienestar: {Math.round(student.wellbeing_score * 100)}% • {formatDate(student.last_survey_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Seguimientos Próximos
            </h2>
            {data?.upcoming_followups.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay seguimientos programados</p>
            ) : (
              <div className="space-y-3">
                {data?.upcoming_followups.slice(0, 5).map((f) => (
                  <div key={f.intervention_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{f.student_internal_id}</p>
                        <p className="text-xs text-gray-500">{getInterventionLabel(f.type)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      {formatDate(f.follow_up_date, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getInterventionLabel(type: string): string {
  const labels: Record<string, string> = {
    contact_made: 'Contacto realizado',
    session_scheduled: 'Sesión programada',
    external_referral: 'Derivación externa',
    follow_up_pending: 'Seguimiento pendiente',
    case_closed: 'Caso cerrado',
    observation: 'Observación',
  }
  return labels[type] || type
}
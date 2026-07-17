import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { cn, formatDate, formatDateTime, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { ArrowLeft, MessageSquare, Calendar, Heart, Shield, Users, TrendingUp, TrendingDown, Minus, Plus, X, Loader2, AlertCircle, Clock } from 'lucide-react'

interface TrendPoint {
  date: string
  overall: number
  emotional: number
  safety: number
  belonging: number
  risk_level: string
}

interface SupportRequest {
  id: string
  request_type: string
  message?: string
  is_anonymous: boolean
  status: string
  created_at: string
  resolved_at?: string
}

interface Intervention {
  id: string
  intervention_type: string
  description: string
  outcome?: string
  follow_up_date?: string
  is_completed: boolean
  completed_at?: string
  created_at: string
  psychologist_name: string
}

interface StudentDetail {
  id: string
  internal_id: string
  classroom_name: string
  grade: number
  section: string
  wellbeing_history: TrendPoint[]
  support_requests: SupportRequest[]
  interventions: Intervention[]
}

export function PsychologistStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'trend' | 'requests' | 'interventions'>('trend')
  const [newIntervention, setNewIntervention] = useState(false)
  const [interventionForm, setInterventionForm] = useState({
    type: 'contact_made',
    description: '',
    follow_up_date: '',
    outcome: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      async function fetchDetail() {
        try {
          const res = await api.get(`/dashboard/students/${id}/trend`, { params: { weeks: 12 } })
          setStudent(res.data)
        } catch {
          console.error('Failed to fetch student detail')
        } finally {
          setLoading(false)
        }
      }
      fetchDetail()
    }
  }, [id])

  const handleCreateIntervention = async () => {
    if (!id || !interventionForm.description.trim()) return
    setSubmitting(true)
    try {
      await api.post('/interventions', {
        student_id: id,
        intervention_type: interventionForm.type,
        description: interventionForm.description,
        follow_up_date: interventionForm.follow_up_date || undefined,
        outcome: interventionForm.type === 'case_closed' ? interventionForm.outcome : undefined,
      })
      setNewIntervention(false)
      setInterventionForm({ type: 'contact_made', description: '', follow_up_date: '', outcome: '' })
      const res = await api.get(`/dashboard/students/${id}/trend`, { params: { weeks: 12 } })
      setStudent(res.data)
    } catch {
      console.error('Failed to create intervention')
    } finally {
      setSubmitting(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'sudden_drop': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      anonymous_message: 'Mensaje anónimo',
      request_support: 'Solicitud de apoyo',
      request_contact: 'Solicitud de contacto',
      report_concern: 'Reporte de preocupación',
    }
    return labels[type] || type
  }

  const getInterventionLabel = (type: string) => {
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

  if (loading) {
    return <div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded w-1/4"></div><div className="h-64 bg-gray-200 rounded"></div></div>
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Estudiante no encontrado</h2>
        <Link to="/psicologo/estudiantes" className="btn-primary mt-4 inline-block">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la lista
        </Link>
      </div>
    )
  }

  const latest = student.wellbeing_history[student.wellbeing_history.length - 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/psicologo/estudiantes" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{student.classroom_name} • {student.grade}°{student.section}</p>
          <h1 className="text-2xl font-bold text-gray-900">{student.internal_id}</h1>
        </div>
        <div className="flex items-center gap-3">
          {latest && (
            <span className={cn('badge px-3 py-1.5', getRiskLevelColor(latest.risk_level))}>
              {getRiskLevelLabel(latest.risk_level)}
            </span>
          )}
          <button onClick={() => setNewIntervention(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Nueva Intervención
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 px-1" role="tablist">
          {[
            { key: 'trend', label: 'Evolución', icon: <TrendingUp className="w-4 h-4" /> },
            { key: 'requests', label: 'Solicitudes', icon: <MessageSquare className="w-4 h-4" /> },
            { key: 'interventions', label: 'Intervenciones', icon: <Calendar className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'trend' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Bienestar (últimas 12 semanas)</h2>
            <div className="h-72 relative">
              {student.wellbeing_history.length > 0 ? (
                <svg className="w-full h-full" viewBox="0 0 800 256" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={student.wellbeing_history.map((point, i) => {
                      const x = (i / Math.max(1, student.wellbeing_history.length - 1)) * 800
                      const y = 256 - point.overall * 256
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`${student.wellbeing_history.map((point, i) => {
                      const x = (i / Math.max(1, student.wellbeing_history.length - 1)) * 800
                      const y = 256 - point.overall * 256
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')} L 800 256 L 0 256 Z`}
                    fill="url(#areaGradient)"
                  />
                  {student.wellbeing_history.map((point, i) => (
                    <g key={i}>
                      <circle
                        cx={(i / Math.max(1, student.wellbeing_history.length - 1)) * 800}
                        cy={256 - point.overall * 256}
                        r="5"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                </svg>
              ) : (
                <p className="text-center text-gray-500 h-full flex items-center justify-center">Sin datos de bienestar</p>
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-4 px-2">
              {student.wellbeing_history.map((point, i) => (
                i % Math.max(1, Math.floor(student.wellbeing_history.length / 4)) === 0 && (
                  <span key={i}>{formatDate(point.date, { month: 'short', day: 'numeric' })}</span>
                )
              ))}
            </div>
          </div>

          {latest && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'General', value: latest.overall, color: 'primary', icon: <Heart className="w-5 h-5" /> },
                { label: 'Emocional', value: latest.emotional, color: 'pink', icon: <Heart className="w-5 h-5" /> },
                { label: 'Seguridad', value: latest.safety, color: 'blue', icon: <Shield className="w-5 h-5" /> },
                { label: 'Pertenencia', value: latest.belonging, color: 'purple', icon: <Users className="w-5 h-5" /> },
              ].map((item) => (
                <div key={item.label} className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    {item.icon}
                  </div>
                  <p className={cn('text-3xl font-bold', `text-${item.color}-600`)}>{Math.round(item.value * 100)}%</p>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial Detallado</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">General</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Emocional</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seguridad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pertenencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Riesgo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {student.wellbeing_history.slice().reverse().map((point) => (
                    <tr key={point.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(point.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{Math.round(point.overall * 100)}%</td>
                      <td className="px-4 py-3 text-sm text-pink-600">{Math.round(point.emotional * 100)}%</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{Math.round(point.safety * 100)}%</td>
                      <td className="px-4 py-3 text-sm text-purple-600">{Math.round(point.belonging * 100)}%</td>
                      <td className="px-4 py-3"><span className={cn('badge', getRiskLevelColor(point.risk_level))}>{getRiskLevelLabel(point.risk_level)}</span></td>
                      <td className="px-4 py-3 text-sm flex items-center gap-1">
                        {getTrendIcon(point.risk_level === 'critical' || point.risk_level === 'high' ? 'declining' : 'stable')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {student.support_requests.length === 0 ? (
            <div className="card p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin solicitudes</h3>
              <p className="text-gray-600">Este estudiante no ha realizado solicitudes de apoyo</p>
            </div>
          ) : (
            student.support_requests.map((req) => (
              <div key={req.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', req.is_anonymous ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600')}>
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{getRequestTypeLabel(req.request_type)}</span>
                        <span className={cn('badge', req.is_anonymous ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600')}>
                          {req.is_anonymous ? 'Anónimo' : 'Identificado'}
                        </span>
                        <span className={cn('badge', req.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600')}>
                          {req.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDateTime(req.created_at)}</p>
                    </div>
                  </div>
                </div>
                {req.message && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{req.message}</p>
                  </div>
                )}
                {req.resolved_at && (
                  <p className="mt-2 text-sm text-gray-500">Resuelto: {formatDateTime(req.resolved_at)}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'interventions' && (
        <div className="space-y-4">
          {student.interventions.length === 0 ? (
            <div className="card p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin intervenciones registradas</h3>
              <p className="text-gray-600">Registra la primera intervención para este estudiante</p>
              <button onClick={() => setNewIntervention(true)} className="btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" /> Nueva Intervención
              </button>
            </div>
          ) : (
            student.interventions.map((intervention) => (
              <div key={intervention.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn('badge', intervention.is_completed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600')}>
                        {intervention.is_completed ? 'Completada' : 'Pendiente'}
                      </span>
                      <span className="badge bg-blue-100 text-blue-700">{getInterventionLabel(intervention.intervention_type)}</span>
                    </div>
                    <p className="text-gray-900 mb-2">{intervention.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>Por: {intervention.psychologist_name}</span>
                      <span>{formatDateTime(intervention.created_at)}</span>
                      {intervention.follow_up_date && (
                        <span className={cn('flex items-center gap-1', new Date(intervention.follow_up_date) < new Date() && !intervention.is_completed ? 'text-red-600' : '')}>
                          <Clock className="w-3 h-3" /> Seguimiento: {formatDate(intervention.follow_up_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {intervention.outcome && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-1">Resultado / Cierre:</p>
                    <p className="text-sm text-gray-600">{intervention.outcome}</p>
                  </div>
                )}
                {intervention.completed_at && (
                  <p className="mt-2 text-sm text-gray-500">Completada: {formatDateTime(intervention.completed_at)}</p>
                )}
              </div>
            ))
          )}

          {newIntervention && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setNewIntervention(false)}>
              <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Nueva Intervención</h3>
                  <button onClick={() => setNewIntervention(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Tipo de intervención</label>
                    <select value={interventionForm.type} onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })} className="input">
                      <option value="contact_made">Contacto realizado</option>
                      <option value="session_scheduled">Sesión programada</option>
                      <option value="external_referral">Derivación externa</option>
                      <option value="follow_up_pending">Seguimiento pendiente</option>
                      <option value="case_closed">Caso cerrado</option>
                      <option value="observation">Observación</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Descripción <span className="text-red-500">*</span></label>
                    <textarea
                      value={interventionForm.description}
                      onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
                      rows={3}
                      className="input"
                      placeholder="Describe la intervención realizada..."
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Fecha de seguimiento (opcional)</label>
                    <input
                      type="date"
                      value={interventionForm.follow_up_date}
                      onChange={(e) => setInterventionForm({ ...interventionForm, follow_up_date: e.target.value })}
                      className="input"
                    />
                  </div>

                  {interventionForm.type === 'case_closed' && (
                    <div>
                      <label className="label">Resultado / Cierre</label>
                      <textarea
                        value={interventionForm.outcome}
                        onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value })}
                        rows={2}
                        className="input"
                        placeholder="Describe el resultado o motivo de cierre..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button onClick={() => setNewIntervention(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={handleCreateIntervention} disabled={submitting || !interventionForm.description.trim()} className="btn-primary flex-1">
                    {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
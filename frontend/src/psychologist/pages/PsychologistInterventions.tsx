import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { cn, formatDate, formatDateTime, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { Search, Calendar, Plus, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

interface InterventionListItem {
  id: string
  student_id: string
  student_internal_id: string
  classroom_name: string
  intervention_type: string
  description: string
  outcome?: string
  follow_up_date?: string
  is_completed: boolean
  completed_at?: string
  created_at: string
  psychologist_name: string
  risk_level: string
}

export function PsychologistInterventions() {
  const [interventions, setInterventions] = useState<InterventionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [newIntervention, setNewIntervention] = useState(false)
  const [interventionForm, setInterventionForm] = useState({
    student_id: '',
    type: 'conversation',
    description: '',
    follow_up_date: '',
    outcome: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    async function fetchInterventions() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('size', '20')
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (typeFilter) params.set('type', typeFilter)
        if (statusFilter) params.set('status', statusFilter)

        const res = await api.get(`/interventions?${params.toString()}`)
        setInterventions(res.data.interventions)
        setTotal(res.data.total)
        setPages(res.data.pages)
      } catch {
        console.error('Failed to fetch interventions')
      } finally {
        setLoading(false)
      }
    }
    fetchInterventions()
  }, [page, debouncedSearch, typeFilter, statusFilter])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      conversation: 'Conversación',
      session_scheduled: 'Sesión programada',
      external_referral: 'Derivación externa',
      group_activity: 'Actividad grupal',
      follow_up: 'Seguimiento',
      parent_contact: 'Contacto apoderado',
      other: 'Otra',
    }
    return labels[type] || type
  }

  const handleCreateIntervention = async () => {
    if (!interventionForm.student_id || !interventionForm.description.trim()) return
    setSubmitting(true)
    try {
      await api.post('/interventions', {
        student_id: interventionForm.student_id,
        intervention_type: interventionForm.type,
        description: interventionForm.description,
        follow_up_date: interventionForm.follow_up_date || undefined,
        outcome: interventionForm.outcome || undefined,
      })
      setNewIntervention(false)
      setInterventionForm({ student_id: '', type: 'conversation', description: '', follow_up_date: '', outcome: '' })
      const res = await api.get(`/interventions?page=1&size=20`)
      setInterventions(res.data.interventions)
    } catch {
      console.error('Failed to create intervention')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && interventions.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/4"></div></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intervenciones</h1>
          <p className="text-gray-600">Registro y seguimiento de intervenciones realizadas</p>
        </div>
        <button onClick={() => setNewIntervention(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Nueva Intervención
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por estudiante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">Todos los tipos</option>
            <option value="conversation">Conversación</option>
            <option value="session_scheduled">Sesión programada</option>
            <option value="external_referral">Derivación externa</option>
            <option value="group_activity">Actividad grupal</option>
            <option value="follow_up">Seguimiento</option>
            <option value="parent_contact">Contacto apoderado</option>
            <option value="other">Otra</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completadas</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estudiante</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Seguimiento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Psicólogo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {interventions.map((intervention) => (
                <tr key={intervention.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium text-sm">{intervention.student_internal_id.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{intervention.student_internal_id}</p>
                        <span className={cn('badge', getRiskLevelColor(intervention.risk_level))}>
                          {getRiskLevelLabel(intervention.risk_level)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{intervention.classroom_name}</td>
                  <td className="px-4 py-4">
                    <span className="badge bg-primary-100 text-primary-700">{getTypeLabel(intervention.intervention_type)}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{intervention.description}</td>
                  <td className="px-4 py-4">
                    <span className={cn('badge', intervention.is_completed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600')}>
                      {intervention.is_completed ? 'Completada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {intervention.follow_up_date ? (
                      <span className={cn('flex items-center gap-1', new Date(intervention.follow_up_date) < new Date() && !intervention.is_completed ? 'text-red-600' : 'text-gray-600')}>
                        <Calendar className="w-3 h-3" /> {formatDate(intervention.follow_up_date)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin fecha</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{intervention.psychologist_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{formatDateTime(intervention.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {newIntervention && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setNewIntervention(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Nueva Intervención</h3>
              <button onClick={() => setNewIntervention(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Estudiante <span className="text-red-500">*</span></label>
                <select
                  value={interventionForm.student_id}
                  onChange={(e) => setInterventionForm({ ...interventionForm, student_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar estudiante...</option>
                  {interventions.slice(0, 50).map((i) => (
                    <option key={i.student_id} value={i.student_id}>{i.student_internal_id} - {i.classroom_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tipo de intervención</label>
                <select value={interventionForm.type} onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })} className="input">
                  <option value="conversation">Conversación</option>
                  <option value="session_scheduled">Sesión programada</option>
                  <option value="external_referral">Derivación externa</option>
                  <option value="group_activity">Actividad grupal</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="parent_contact">Contacto apoderado</option>
                  <option value="other">Otra</option>
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

              <div>
                <label className="label">Resultado / Cierre (opcional)</label>
                <textarea
                  value={interventionForm.outcome}
                  onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value })}
                  rows={2}
                  className="input"
                  placeholder="Describe el resultado o motivo de cierre..."
                />
              </div>
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
  )
}
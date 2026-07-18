import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { cn, formatDateTime, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { MessageSquareWarning, Filter, X, Clock, Check, AlertTriangle } from 'lucide-react'

interface ChatReportItem {
  id: string
  student_id: string
  student_internal_id: string
  student_name: string
  classroom_name: string
  session_id: string
  risk_level: string
  risk_signals: string[]
  summary: string | null
  status: string
  created_at: string
}

interface ReportDetail extends ChatReportItem {
  messages_snapshot: Array<{ role: string; content: string }>
  reviewer_notes: string | null
  reviewed_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  dismissed: 'Descartado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

export function PsychologistChatReports() {
  const [reports, setReports] = useState<ChatReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterRisk, setFilterRisk] = useState<string>('')
  const [detail, setDetail] = useState<ReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      if (filterRisk) params.risk_level = filterRisk
      const res = await api.get('/chat-reports', { params })
      setReports(res.data)
    } catch {
      console.error('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [filterStatus, filterRisk])

  const openDetail = async (reportId: string) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/chat-reports/${reportId}`)
      setDetail(res.data)
    } catch {
      console.error('Failed to load detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const updateReport = async (reportId: string, status: string, notes?: string) => {
    setUpdating(true)
    try {
      await api.patch(`/chat-reports/${reportId}`, { status, reviewer_notes: notes })
      setDetail(null)
      fetchReports()
    } catch {
      console.error('Failed to update report')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes del Chat</h1>
        <p className="text-gray-600">Alertas generadas automáticamente por el asistente de bienestar</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="reviewed">Revisados</option>
            <option value="dismissed">Descartados</option>
          </select>
        </div>
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="">Todos los niveles</option>
          <option value="critical">Crítico</option>
          <option value="high">Alto</option>
          <option value="moderate">Moderado</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquareWarning className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin reportes</h3>
          <p className="text-gray-500">No hay reportes que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => openDetail(report.id)}
              className="w-full text-left card p-4 hover:border-primary-300 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{report.student_internal_id}</span>
                    <span className="text-sm text-gray-500">{report.student_name}</span>
                    <span className="text-xs text-gray-400">{report.classroom_name}</span>
                    <span className={cn('badge', getRiskLevelColor(report.risk_level))}>
                      {getRiskLevelLabel(report.risk_level)}
                    </span>
                    <span className={cn('badge', STATUS_COLORS[report.status])}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  {report.summary && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.summary}</p>
                  )}
                  {report.risk_signals.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {report.risk_signals.map((signal, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                          {signal}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTime(report.created_at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{detail.student_internal_id}</span>
                  <span className={cn('badge', getRiskLevelColor(detail.risk_level))}>
                    {getRiskLevelLabel(detail.risk_level)}
                  </span>
                  <span className={cn('badge', STATUS_COLORS[detail.status])}>
                    {STATUS_LABELS[detail.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{detail.student_name} · {detail.classroom_name}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
              <>
              {detail.risk_signals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-500" />
                    Señales detectadas
                  </h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {detail.risk_signals.map((signal, i) => (
                      <span key={i} className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-full">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.summary && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl whitespace-pre-line">{detail.summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Transcripción</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {detail.messages_snapshot.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                      <div className={cn(
                        'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary-50 text-primary-800 border border-primary-100'
                          : 'bg-gray-100 text-gray-700'
                      )}>
                        <span className="text-[10px] font-medium text-gray-400 block mb-1">
                          {msg.role === 'user' ? 'Estudiante' : 'Asistente'}
                        </span>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detail.reviewer_notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tus notas</h3>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-xl">{detail.reviewer_notes}</p>
                </div>
              )}
              </>
              )}
            </div>

            {detail.status === 'pending' && (
              <div className="border-t border-gray-100 p-6 flex gap-3">
                <button
                  onClick={() => updateReport(detail.id, 'reviewed')}
                  disabled={updating}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Marcar como revisado
                </button>
                <button
                  onClick={() => updateReport(detail.id, 'dismissed')}
                  disabled={updating}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Descartar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

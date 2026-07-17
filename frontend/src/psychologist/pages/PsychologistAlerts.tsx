import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Eye, TrendingDown, Clock, TrendingUp, Minus, AlertCircle, Shield } from 'lucide-react'

interface AlertItem {
  student_id: string
  student_internal_id: string
  classroom_name: string
  risk_level: string
  risk_probability: number
  trend: string
  weeks_declining: number
  sudden_drop: boolean
  last_survey_date: string
  recommended_action: string
}

export function PsychologistAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [trendFilter, setTrendFilter] = useState<string>('')

  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('size', '20')
        if (riskFilter) params.set('risk_level', riskFilter)
        if (trendFilter) params.set('trend', trendFilter)

        const res = await api.get(`/risk/alerts?${params.toString()}`)
        setAlerts(res.data.alerts)
        setTotal(res.data.total)
        setPages(res.data.pages)
      } catch {
        console.error('Failed to fetch alerts')
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [page, riskFilter, trendFilter])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'sudden_drop': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'declining': return 'En declive'
      case 'sudden_drop': return 'Caída brusca'
      case 'stable': return 'Estable'
      case 'improving': return 'Mejorando'
      default: return trend
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/4"></div></div>
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const riskCounts = alerts.reduce((acc, alert) => {
    acc[alert.risk_level] = (acc[alert.risk_level] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas de Riesgo</h1>
          <p className="text-gray-600">Estudiantes que requieren atención prioritaria según su bienestar</p>
        </div>
        <div className="flex gap-2">
          <span className="badge bg-red-100 text-red-600">{riskCounts.critical || 0} Críticos</span>
          <span className="badge bg-orange-100 text-orange-600">{riskCounts.high || 0} Altos</span>
          <span className="badge bg-yellow-100 text-yellow-600">{riskCounts.moderate || 0} Moderados</span>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">Todos los niveles</option>
              <option value="critical">Crítico</option>
              <option value="high">Alto</option>
              <option value="moderate">Moderado</option>
              <option value="low">Bajo</option>
            </select>
            <select value={trendFilter} onChange={(e) => { setTrendFilter(e.target.value); setPage(1); }} className="input w-auto">
              <option value="">Todas las tendencias</option>
              <option value="declining">En declive</option>
              <option value="sudden_drop">Caída brusca</option>
              <option value="stable">Estable</option>
              <option value="improving">Mejorando</option>
            </select>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin alertas activas</h3>
          <p className="text-gray-600">No hay estudiantes que requieran atención prioritaria en este momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.student_id} className="card p-6 border-l-4" style={{ borderLeftColor: getRiskLevelColor(alert.risk_level).includes('green') ? '#22c55e' : getRiskLevelColor(alert.risk_level).includes('yellow') ? '#f59e0b' : getRiskLevelColor(alert.risk_level).includes('red') ? '#ef4444' : '#f97316' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: getRiskLevelColor(alert.risk_level).includes('green') ? '#dcfce7' : getRiskLevelColor(alert.risk_level).includes('yellow') ? '#fef3c7' : getRiskLevelColor(alert.risk_level).includes('red') ? '#fef2f2' : '#fff7ed' }}>
                    <span className="text-lg font-bold" style={{ color: getRiskLevelColor(alert.risk_level).includes('green') ? '#16a34a' : getRiskLevelColor(alert.risk_level).includes('yellow') ? '#d97706' : getRiskLevelColor(alert.risk_level).includes('red') ? '#dc2626' : '#ea580c' }}>
                      {getRiskLevelLabel(alert.risk_level).charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{alert.student_internal_id}</p>
                      <span className={cn('badge', getRiskLevelColor(alert.risk_level))}>
                        {getRiskLevelLabel(alert.risk_level)}
                      </span>
                      {alert.sudden_drop && (
                        <span className="badge bg-red-100 text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Caída brusca
                        </span>
                      )}
                      <span className="text-sm text-gray-500">{alert.classroom_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{Math.round(alert.risk_probability * 100)}%</p>
                    <p className="text-xs text-gray-500">Prob. riesgo</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(alert.trend)}
                      <span>{getTrendLabel(alert.trend)}</span>
                    </div>
                    {alert.trend === 'declining' && (
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-3 h-3" /> {alert.weeks_declining} sem. bajando
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(alert.last_survey_date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600"><strong>Acción recomendada:</strong> {alert.recommended_action}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">
                    <Eye className="w-4 h-4 mr-1" /> Ver detalle
                  </button>
                  <button className="btn-primary text-sm">
                    <Shield className="w-4 h-4 mr-1" /> Intervenir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
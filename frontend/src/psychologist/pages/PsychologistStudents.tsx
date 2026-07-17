import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { Search, ChevronLeft, ChevronRight, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface StudentListItem {
  id: string
  internal_id: string
  classroom_name: string
  grade: number
  section: string
  latest_wellbeing: number | null
  risk_level: string
  trend: string
  weeks_declining: number
  sudden_drop: boolean
  last_survey_date: string | null
  pending_requests: number
}

export function PsychologistStudents() {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [trendFilter, setTrendFilter] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('size', '20')
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (riskFilter) params.set('risk_level', riskFilter)
        if (trendFilter) params.set('trend', trendFilter)

        const res = await api.get(`/dashboard/students?${params.toString()}`)
        setStudents(res.data.students)
        setTotal(res.data.total)
        setPages(res.data.pages)
      } catch {
        console.error('Failed to fetch students')
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [page, debouncedSearch, riskFilter, trendFilter])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'sudden_drop': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/4"></div></div>
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-gray-600">Lista de estudiantes a tu cargo con su estado de bienestar</p>
        </div>
        <span className="text-sm text-gray-500">{total} estudiantes</span>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID interno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="input w-auto"
            >
              <option value="">Todos los riesgos</option>
              <option value="critical">Crítico</option>
              <option value="high">Alto</option>
              <option value="moderate">Moderado</option>
              <option value="low">Bajo</option>
            </select>
            <select
              value={trendFilter}
              onChange={(e) => { setTrendFilter(e.target.value); setPage(1); }}
              className="input w-auto"
            >
              <option value="">Todas las tendencias</option>
              <option value="declining">En declive</option>
              <option value="sudden_drop">Caída brusca</option>
              <option value="stable">Estable</option>
              <option value="improving">Mejorando</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estudiante</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bienestar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Riesgo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tendencia</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Último Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Solicitudes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 font-medium text-sm">{student.internal_id.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.internal_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{student.classroom_name}</span>
                    <span className="text-xs text-gray-400 ml-2">({student.grade}°{student.section})</span>
                  </td>
                  <td className="px-4 py-4">
                    {student.latest_wellbeing !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${student.latest_wellbeing * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{Math.round(student.latest_wellbeing * 100)}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin datos</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('badge', getRiskLevelColor(student.risk_level))}>
                      {getRiskLevelLabel(student.risk_level)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(student.trend)}
                      <span className={cn('text-sm', student.trend === 'declining' || student.trend === 'sudden_drop' ? 'text-red-600' : 'text-gray-600')}>
                        {student.trend === 'declining' && `↓ ${student.weeks_declining} sem`}
                        {student.trend === 'sudden_drop' && 'Caída brusca'}
                        {student.trend === 'stable' && 'Estable'}
                        {student.trend === 'improving' && 'Mejorando'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {student.last_survey_date ? formatDate(student.last_survey_date) : 'Nunca'}
                  </td>
                  <td className="px-4 py-4">
                    {student.pending_requests > 0 ? (
                      <span className="badge bg-yellow-100 text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {student.pending_requests}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin solicitudes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
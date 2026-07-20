import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { Search, ChevronLeft, ChevronRight, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { DashboardSpinner } from '../../components/LoadingScreen'

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
  const navigate = useNavigate()
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
      default: return <Minus className="w-4 h-4 text-[#2A3B47]/30" />
    }
  }

  if (loading && students.length === 0) {
    return <DashboardSpinner />
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A3B47]">Estudiantes</h1>
          <p className="text-[#2A3B47]/80 mt-1">Lista de estudiantes a tu cargo con su estado de bienestar</p>
        </div>
        <span className="text-sm font-semibold text-[#2A3B47]/50">{total} estudiantes</span>
      </div>

      <div className="card p-4 bg-white border border-primary-100/60 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2A3B47]/50" />
            <input
              type="text"
              placeholder="Buscar por ID interno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 border-primary-200 focus:ring-primary-400 focus:border-transparent rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="input w-auto border-primary-200 focus:ring-primary-400 focus:border-transparent rounded-xl font-medium text-sm cursor-pointer"
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
              className="input w-auto border-primary-200 focus:ring-primary-400 focus:border-transparent rounded-xl font-medium text-sm cursor-pointer"
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

      <div className="card overflow-hidden bg-white border border-primary-100/60 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-50/50 border-b border-primary-100">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Estudiante</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Aula</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Bienestar</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Riesgo</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Tendencia</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Último Check-in</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-[#2A3B47]/70 uppercase tracking-wider">Solicitudes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-primary-50/20 transition-colors cursor-pointer" onClick={() => navigate(`/psicologo/estudiantes/${student.id}`)}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shadow-xs">
                        <span className="text-primary-700 font-bold text-sm">{student.internal_id.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#2A3B47] text-sm">{student.internal_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-[#2A3B47]/80">{student.classroom_name}</span>
                    <span className="text-xs font-medium text-[#2A3B47]/50 ml-2">({student.grade}°{student.section})</span>
                  </td>
                  <td className="px-4 py-4">
                    {student.latest_wellbeing !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-3 bg-primary-50/60 rounded-full overflow-hidden border border-primary-100/30">
                          <div
                            className="h-full bg-accent-400 rounded-full"
                            style={{ width: `${student.latest_wellbeing * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-[#2A3B47]">{Math.round(student.latest_wellbeing * 100)}%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[#2A3B47]/30">Sin datos</span>
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
                      <span className={cn('text-sm font-semibold', student.trend === 'declining' || student.trend === 'sudden_drop' ? 'text-red-600' : 'text-[#2A3B47]/80')}>
                        {student.trend === 'declining' && `↓ ${student.weeks_declining} sem`}
                        {student.trend === 'sudden_drop' && 'Caída brusca'}
                        {student.trend === 'stable' && 'Estable'}
                        {student.trend === 'improving' && 'Mejorando'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-[#2A3B47]/60">
                    {student.last_survey_date ? formatDate(student.last_survey_date) : 'Nunca'}
                  </td>
                  <td className="px-4 py-4">
                    {student.pending_requests > 0 ? (
                      <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        {student.pending_requests}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-[#2A3B47]/35">Sin solicitudes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-4 border-t border-primary-100/60 bg-white flex items-center justify-between">
            <p className="text-xs font-semibold text-[#2A3B47]/50">
              Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-primary-100 text-[#2A3B47]/70 hover:bg-primary-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-bold"
              >
                &laquo;
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-primary-100 text-[#2A3B47]/70 hover:bg-primary-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {(() => {
                const pageNumbers: number[] = []
                const maxVisible = 5
                let start = Math.max(1, page - Math.floor(maxVisible / 2))
                let end = Math.min(pages, start + maxVisible - 1)
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1)
                }
                for (let i = start; i <= end; i++) pageNumbers.push(i)
                return pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer',
                      p === page
                        ? 'bg-accent-400 text-white border-accent-500 shadow-xs'
                        : 'border-primary-100 text-[#2A3B47]/70 hover:bg-primary-50/50'
                    )}
                  >
                    {p}
                  </button>
                ))
              })()}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg border border-primary-100 text-[#2A3B47]/70 hover:bg-primary-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page === pages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-primary-100 text-[#2A3B47]/70 hover:bg-primary-50/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-bold"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
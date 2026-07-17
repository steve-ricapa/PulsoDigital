import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { Calendar, ChevronLeft, ChevronRight, Activity, Shield } from 'lucide-react'

interface TrendPoint {
  date: string
  overall: number
  emotional: number
  safety: number
  belonging: number
  risk_level: string
}

export function StudentHistory() {
  const { user } = useAuth()
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart')

  useEffect(() => {
    async function fetchTrend() {
      if (!user?.student_profile) return
      try {
        const res = await api.get(`/wellbeing/trend/${user.student_profile.id}`, { params: { weeks: 52 } })
        setTrend(res.data.scores || [])
      } catch {
        console.error('Failed to fetch trend')
      } finally {
        setLoading(false)
      }
    }
    fetchTrend()
  }, [user])

  const filteredTrend = trend.filter((point) => {
    const d = new Date(point.date)
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()
  })

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const formatMonth = (date: Date) => date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const avgOverall = filteredTrend.length > 0
    ? Math.round(filteredTrend.reduce((a, b) => a + b.overall, 0) / filteredTrend.length * 100)
    : 0

  const latest = trend[trend.length - 1]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Historial</h1>
          <p className="text-gray-600 mt-1">Evolución de tu bienestar en el tiempo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('chart')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'chart' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100')}>Gráfico</button>
          <button onClick={() => setViewMode('list')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100')}>Lista</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Promedio General</p>
              <p className="text-2xl font-bold text-gray-900">{avgOverall}%</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Semanas con datos</p>
              <p className="text-2xl font-bold text-gray-900">{filteredTrend.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Nivel actual</p>
              <span className={cn('badge', latest && getRiskLevelColor(latest.risk_level))}>
                {latest ? getRiskLevelLabel(latest.risk_level) : 'Sin datos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Tendencia de Bienestar</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium text-gray-700 capitalize">{formatMonth(currentMonth)}</span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="h-72 relative">
            {filteredTrend.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>No hay datos para este mes</p>
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 800 256" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={filteredTrend.map((point, i) => {
                    const x = (i / Math.max(1, filteredTrend.length - 1)) * 800
                    const y = 256 - point.overall * 256
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={`${filteredTrend.map((point, i) => {
                    const x = (i / Math.max(1, filteredTrend.length - 1)) * 800
                    const y = 256 - point.overall * 256
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')} L 800 256 L 0 256 Z`}
                  fill="url(#areaGradient)"
                />
                {filteredTrend.map((point, i) => (
                  <circle
                    key={i}
                    cx={(i / Math.max(1, filteredTrend.length - 1)) * 800}
                    cy={256 - point.overall * 256}
                    r="4"
                    fill="#3b82f6"
                  />
                ))}
              </svg>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrend.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay datos para este mes</p>
            ) : (
              filteredTrend
                .slice()
                .reverse()
                .map((point) => (
                  <div key={point.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-24">{formatDate(point.date, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <div className="w-40 h-8 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${point.overall * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-16 text-right">{Math.round(point.overall * 100)}%</span>
                    </div>
                    <span className={cn('badge', getRiskLevelColor(point.risk_level))}>
                      {getRiskLevelLabel(point.risk_level)}
                    </span>
                  </div>
                ))
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{latest ? Math.round(latest.emotional * 100) : 0}%</p>
            <p className="text-xs text-blue-700">Emocional</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{latest ? Math.round(latest.safety * 100) : 0}%</p>
            <p className="text-xs text-green-700">Seguridad</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{latest ? Math.round(latest.belonging * 100) : 0}%</p>
            <p className="text-xs text-purple-700">Pertenencia</p>
          </div>
        </div>
      </div>
    </div>
  )
}
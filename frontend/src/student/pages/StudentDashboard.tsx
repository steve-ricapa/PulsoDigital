import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { cn, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../../lib/utils'
import { Heart, Activity, Smile, Meh, Frown, ChevronRight } from 'lucide-react'

interface TrendPoint {
  date: string
  overall: number
  emotional: number
  safety: number
  belonging: number
  risk_level: string
}

export function StudentDashboard() {
  const { user } = useAuth()
  const [wellbeing, setWellbeing] = useState<any>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function fetchData() {
      if (!user?.student_profile) return
      try {
        setLoading(true)
        const [wbRes, trendRes] = await Promise.all([
          api.get(`/wellbeing/student/${user.student_profile.id}/latest`),
          api.get(`/wellbeing/trend/${user.student_profile.id}`, { params: { weeks: 8 } }),
        ])
        setWellbeing(wbRes.data)
        setTrend(trendRes.data.scores || [])
      } catch {
        setError('No se pudo cargar la información')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  const getEmoji = (score: number) => {
    if (score >= 0.8) return <Smile className="w-8 h-8 text-green-500" />
    if (score >= 0.6) return <Meh className="w-8 h-8 text-yellow-500" />
    return <Frown className="w-8 h-8 text-red-500" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-gray-600 mt-1">Aquí puedes ver cómo va tu bienestar esta semana</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bienestar General</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {Math.round((wellbeing?.overall_score || 0) * 100)}%
              </p>
            </div>
            <div className="text-4xl">{getEmoji(wellbeing?.overall_score || 0)}</div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(wellbeing?.overall_score || 0) * 100}%` }}
            />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-600">Estado Emocional</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round((wellbeing?.emotional_score || 0) * 100)}%</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(wellbeing?.emotional_score || 0) * 100}%` }} />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-600">Seguridad</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round((wellbeing?.safety_score || 0) * 100)}%</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(wellbeing?.safety_score || 0) * 100}%` }} />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-600">Pertenencia</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round((wellbeing?.belonging_score || 0) * 100)}%</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(wellbeing?.belonging_score || 0) * 100}%` }} />
          </div>
        </div>
      </div>

      {wellbeing && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Nivel de Atención</h2>
            <span className={cn('badge', getRiskLevelColor(wellbeing.risk_level))}>
              {getRiskLevelLabel(wellbeing.risk_level)}
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            {wellbeing.risk_level === 'critical' && 'Se recomienda contactar a tu psicólogo escolar lo antes posible.'}
            {wellbeing.risk_level === 'high' && 'Tu psicólogo escolar revisará tu situación pronto.'}
            {wellbeing.risk_level === 'moderate' && 'Estamos monitoreando tu bienestar de cerca.'}
            {wellbeing.risk_level === 'low' && 'Tu bienestar está en un buen rango. ¡Sigue así!'}
          </p>
          <p className="text-xs text-gray-400 mt-2">Actualizado: {formatDate(wellbeing.calculated_at)}</p>
        </div>
      )}

      {trend.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Bienestar (últimas 8 semanas)</h2>
          <div className="h-64">
            <svg className="w-full h-full" viewBox="0 0 800 256" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={trend.map((point, i) => {
                  const x = (i / (trend.length - 1)) * 800
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
                d={`${trend.map((point, i) => {
                  const x = (i / (trend.length - 1)) * 800
                  const y = 256 - point.overall * 256
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')} L 800 256 L 0 256 Z`}
                fill="url(#gradient)"
              />
              {trend.map((point, i) => (
                <circle
                  key={i}
                  cx={(i / (trend.length - 1)) * 800}
                  cy={256 - point.overall * 256}
                  r="4"
                  fill="#3b82f6"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-4 px-2">
            {trend.map((point, i) => (
              i % Math.max(1, Math.floor(trend.length / 4)) === 0 && (
                <span key={i}>{formatDate(point.date, { month: 'short', day: 'numeric' })}</span>
              )
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/pulso/checkin" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Check-in Semanal</h3>
              <p className="text-sm text-gray-600">Responde tu encuesta de bienestar</p>
            </div>
            <ChevronRight className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </a>

        <a href="/ayuda" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
              <Heart className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Quiero Apoyo</h3>
              <p className="text-sm text-gray-600">Habla con alguien de confianza</p>
            </div>
            <ChevronRight className="ml-auto text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </a>
      </div>
    </div>
  )
}

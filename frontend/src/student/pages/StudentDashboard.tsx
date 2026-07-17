import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface CalendarData {
  completions: string[]
  total: number
  month: number
  year: number
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function StudentDashboard() {
  const { user } = useAuth()
  const [calendar, setCalendar] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  useEffect(() => {
    async function fetchCalendar() {
      if (!user?.student_profile) return
      try {
        setLoading(true)
        const res = await api.get('/responses/quick/calendar', {
          params: { month: currentMonth, year: currentYear },
        })
        setCalendar(res.data)
      } catch {
        setCalendar({ completions: [], total: 0, month: currentMonth, year: currentYear })
      } finally {
        setLoading(false)
      }
    }
    fetchCalendar()
  }, [user, currentMonth, currentYear])

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const completionsSet = new Set(calendar?.completions || [])

  const isCurrentMonth = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()
  const totalWeekdays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentYear, currentMonth - 1, i + 1)
    return d.getDay() < 6
  }).filter(Boolean).length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-gray-600 mt-1">Revisa tu calendario de check-ins diarios</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const completed = completionsSet.has(dateStr)
            const isToday = isCurrentMonth && day === now.getDate()
            const isFuture = isCurrentMonth && day > now.getDate()

            return (
              <div
                key={day}
                className={`
                  relative flex items-center justify-center h-10 rounded-lg text-sm transition-all
                  ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${completed ? 'bg-green-100 text-green-700 font-medium' : ''}
                  ${!completed && !isFuture ? 'bg-gray-50 text-gray-400' : ''}
                  ${isFuture ? 'text-gray-300' : ''}
                `}
              >
                <span>{day}</span>
                {completed && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Check-ins completados</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {calendar?.total || 0}
              <span className="text-lg font-normal text-gray-500 ml-1">/ {totalWeekdays}</span>
            </p>
          </div>
          <div className="text-right">
            {calendar?.total === totalWeekdays && totalWeekdays > 0 ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                ¡Todos completados!
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {totalWeekdays - (calendar?.total || 0)} dias restantes
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${totalWeekdays > 0 ? ((calendar?.total || 0) / totalWeekdays) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}

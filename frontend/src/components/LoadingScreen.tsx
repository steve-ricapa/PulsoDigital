import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'

const LOADING_MESSAGES = [
  'Cargando pulso emocional...',
  'Preparando panel de bienestar...',
  'Sincronizando variables socioemocionales...',
  'Asegurando un espacio seguro y confidencial...',
]

export function DashboardSpinner() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12 px-4 animate-in">
      <div className="relative flex items-center justify-center mb-6">
        {/* outer spinning rings */}
        <div className="w-20 h-20 rounded-full border-4 border-primary-100 border-t-primary-500 animate-spin" />
        <div className="absolute w-14 h-14 rounded-full border-4 border-lavender-100 border-b-lavender-400 animate-spin-reverse" />
        
        {/* Center icon */}
        <div className="absolute w-8 h-8 rounded-lg bg-accent-400 flex items-center justify-center shadow-md">
          <Shield className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-sm font-semibold text-[#2A3B47]/80 text-center animate-pulse min-h-[20px] transition-all duration-300">
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  )
}

export function MetricSkeleton() {
  return (
    <div className="card p-6 animate-pulse relative overflow-hidden bg-white border border-primary-50/50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-primary-100/50 rounded w-1/2" />
          <div className="h-6 bg-primary-100/70 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="card p-6 animate-pulse bg-white border border-primary-50/50">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 bg-primary-100/60 rounded w-1/4" />
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-primary-100/50 rounded-lg" />
          <div className="w-8 h-8 bg-primary-100/50 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="h-10 bg-primary-50/40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

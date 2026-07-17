import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { X, ChevronRight, ChevronLeft, Loader2, MessageCircle, Sun, Moon, Zap, Send } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DailyCheckinProps {
  onComplete: () => void
}

const MOOD_OPTIONS = [
  { value: 5, emoji: '😊', label: 'Genial', color: 'bg-green-100 border-green-400 text-green-700' },
  { value: 4, emoji: '🙂', label: 'Bien', color: 'bg-blue-100 border-blue-400 text-blue-700' },
  { value: 3, emoji: '😐', label: 'Normal', color: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  { value: 2, emoji: '☹️', label: 'Mal', color: 'bg-orange-100 border-orange-400 text-orange-700' },
  { value: 1, emoji: '😢', label: 'Muy mal', color: 'bg-red-100 border-red-400 text-red-700' },
]

const SLEEP_OPTIONS = [
  { value: 3, emoji: '😴', label: 'Dormí bien', color: 'bg-indigo-100 border-indigo-400 text-indigo-700' },
  { value: 2, emoji: '😌', label: 'Más o menos', color: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  { value: 1, emoji: '😟', label: 'Dormí mal', color: 'bg-red-100 border-red-400 text-red-700' },
]

const STEPS = [
  { id: 'mood', title: '¿Cómo te sientes hoy?', subtitle: 'Elige el emoji que mejor te represente', icon: Sun },
  { id: 'sleep', title: '¿Cómo dormiste anoche?', subtitle: 'Tu descanso importa para tu bienestar', icon: Moon },
  { id: 'energy', title: 'Nivel de energía', subtitle: 'Del 1 al 10, ¿cuánta energía tienes hoy?', icon: Zap },
  { id: 'message', title: '¿Algo en tu mente?', subtitle: 'Comparte lo que quieras (opcional)', icon: MessageCircle },
]

export function DailyCheckin({ onComplete }: DailyCheckinProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    mood: 0,
    sleep: 0,
    energy: 5,
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(true)

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleSelectMood = (value: number) => {
    setAnswers((prev) => ({ ...prev, mood: value }))
    setTimeout(() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1)), 300)
  }

  const handleSelectSleep = (value: number) => {
    setAnswers((prev) => ({ ...prev, sleep: value }))
    setTimeout(() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1)), 300)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.post('/responses/quick', {
        student_id: user?.student_profile?.id,
        date: new Date().toISOString().split('T')[0],
        answers: {
          mood: answers.mood,
          sleep: answers.sleep,
          energy: answers.energy,
          message: answers.message.trim() || undefined,
        },
      })
      toast.success('Check-in diario registrado 🎉')
    } catch {
      // Silently fail in demo mode
    } finally {
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(`daily-checkin-${user?.id}`, today)
      setSubmitting(false)
      setVisible(false)
      onComplete()
    }
  }

  const handleSkip = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(`daily-checkin-${user?.id}`, today)
    setVisible(false)
    onComplete()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleSkip}>
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Check-in Rápido</h2>
              <p className="text-primary-100 text-sm mt-1">Solo toma 30 segundos</p>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <step.icon className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{step.subtitle}</p>
          </div>

          {/* Mood selection */}
          {step.id === 'mood' && (
            <div className="flex justify-center gap-3">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectMood(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105',
                    answers.mood === opt.value
                      ? opt.color
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  )}
                >
                  <span className="text-4xl">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sleep selection */}
          {step.id === 'sleep' && (
            <div className="flex justify-center gap-4">
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectSleep(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all hover:scale-105',
                    answers.sleep === opt.value
                      ? opt.color
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  )}
                >
                  <span className="text-5xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Energy slider */}
          {step.id === 'energy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl">😴</span>
                <span className="text-5xl font-bold text-primary-600">{answers.energy}</span>
                <span className="text-3xl">⚡</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={answers.energy}
                onChange={(e) => setAnswers((prev) => ({ ...prev, energy: Number(e.target.value) }))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Baja</span>
                <span>Alta</span>
              </div>
            </div>
          )}

          {/* Message */}
          {step.id === 'message' && (
            <div className="space-y-4">
              <textarea
                value={answers.message}
                onChange={(e) => setAnswers((prev) => ({ ...prev, message: e.target.value }))}
                rows={3}
                maxLength={280}
                placeholder="Escribe lo que quieras compartir..."
                className="input resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{answers.message.length}/280</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
              disabled={currentStep === 0}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === currentStep ? 'bg-primary-600' : i < currentStep ? 'bg-primary-300' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>

            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={answers.mood === 0 || submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
                disabled={
                  (currentStep === 0 && answers.mood === 0) ||
                  (currentStep === 1 && answers.sleep === 0)
                }
                className="btn-primary flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Skip footer */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 w-full text-center"
          >
            Omitir hoy
          </button>
        </div>
      </div>
    </div>
  )
}

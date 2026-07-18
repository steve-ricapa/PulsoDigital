import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Check, Send, Loader2, AlertCircle } from 'lucide-react'

interface Question {
  id: string
  text: string
  question_type: 'emoji_scale' | 'slider' | 'single_choice' | 'multiple_choice' | 'open_text' | 'yes_no'
  order: number
  category: string
  options?: string
  min_value?: number
  max_value?: number
  is_required: boolean
}

interface Survey {
  id: string
  name: string
  questions: Question[]
}

export function StudentCheckIn() {
  const { user } = useAuth()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const res = await api.get('/surveys/current')
        setSurvey(res.data)
      } catch {
        setError('No hay check-in disponible en este momento')
      } finally {
        setLoading(false)
      }
    }
    fetchSurvey()
  }, [])

  const currentQuestion = survey?.questions[currentStep]
  const progress = survey ? ((currentStep + 1) / survey.questions.length) * 100 : 0
  const isLastStep = survey && currentStep === survey.questions.length - 1
  const isAnswered = currentQuestion ? !!answers[currentQuestion.id] : false

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (!isAnswered && currentQuestion?.is_required) return
    if (isLastStep) setShowConfirm(true)
    else setCurrentStep((prev) => prev + 1)
  }

  const handlePrev = () => setCurrentStep((prev) => Math.max(0, prev - 1))

  const handleSubmit = async () => {
    if (!survey || !user?.student_profile) return
    setSubmitting(true)
    try {
      const responses = Object.entries(answers).map(([question_id, value]) => ({
        question_id,
        survey_id: survey.id,
        value_numeric: typeof value === 'number' ? value : undefined,
        value_text: typeof value === 'string' ? value : undefined,
      }))
      await api.post('/responses/bulk', { responses })
      window.location.href = '/pulso'
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin check-in disponible</h2>
        <p className="text-gray-600">{error}</p>
        <a href="/pulso" className="btn-primary mt-4 inline-block">Volver al inicio</a>
      </div>
    )
  }

  if (!survey) return null

  const renderQuestion = () => {
    if (!currentQuestion) return null
    const { question_type, options, min_value, max_value } = currentQuestion
    const answer = answers[currentQuestion.id]

    switch (question_type) {
      case 'emoji_scale':
        return (
          <div className="space-y-6">
            <p className="text-center text-xl font-medium text-gray-900">{currentQuestion.text}</p>
            <div className="flex justify-center gap-3">
              {[
                { value: 1, label: 'Muy mal', emoji: '😞' },
                { value: 2, label: 'Mal', emoji: '😔' },
                { value: 3, label: 'Regular', emoji: '😐' },
                { value: 4, label: 'Bien', emoji: '🙂' },
                { value: 5, label: 'Muy bien', emoji: '😄' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                  className={cn(
                    'emoji-button relative',
                    answer === opt.value && 'selected'
                  )}
                  aria-pressed={answer === opt.value}
                >
                  <span className="text-4xl">{opt.emoji}</span>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                    {opt.label}
                  </span>
                  {answer === opt.value && <Check className="absolute top-2 right-2 w-5 h-5 text-primary-600" />}
                </button>
              ))}
            </div>
          </div>
        )

      case 'slider':
        return (
          <div className="space-y-6">
            <p className="text-center text-xl font-medium text-gray-900">{currentQuestion.text}</p>
            <div className="flex items-center justify-between text-sm text-gray-500 px-2">
              <span>{min_value === 0 ? 'Nada' : min_value}</span>
              <span>{max_value === 10 ? 'Mucho' : max_value}</span>
            </div>
            <input
              type="range"
              min={min_value || 0}
              max={max_value || 10}
              step="1"
              value={typeof answer === 'number' ? answer : (min_value || 0)}
              onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-center text-2xl font-bold text-primary-600">
              {typeof answer === 'number' ? answer : min_value || 0}
            </p>
          </div>
        )

      case 'single_choice':
        return (
          <div className="space-y-4">
            <p className="text-center text-xl font-medium text-gray-900">{currentQuestion.text}</p>
            <div className="space-y-3">
              {options?.split('\n').map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(currentQuestion.id, opt.trim())}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-colors',
                    answer === opt.trim()
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  )}
                >
                  <span className="font-medium text-gray-900">{opt.trim()}</span>
                  {answer === opt.trim() && <Check className="float-right w-5 h-5 text-primary-600 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        )

      case 'open_text':
        return (
          <div className="space-y-4">
            <p className="text-center text-xl font-medium text-gray-900">{currentQuestion.text}</p>
            <textarea
              value={typeof answer === 'string' ? answer : ''}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              placeholder="Escribe tu respuesta aquí... (opcional)"
              rows={4}
              className="input resize-none"
            />
            <p className="text-sm text-gray-500 text-center">Esta pregunta es opcional</p>
          </div>
        )

      case 'yes_no':
        return (
          <div className="space-y-6">
            <p className="text-center text-xl font-medium text-gray-900">{currentQuestion.text}</p>
            <div className="flex justify-center gap-4">
              {[
                { value: true, label: 'Sí', icon: <Check className="w-6 h-6" /> },
                { value: false, label: 'No', icon: <AlertCircle className="w-6 h-6" /> },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 px-8 py-6 rounded-xl border-2 transition-colors min-w-[120px]',
                    answer === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  )}
                >
                  <span className="text-2xl text-primary-600">{opt.icon}</span>
                  <span className="font-medium text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Check-in Semanal</h1>
        <p className="text-gray-600">Tómate un momento para contarnos cómo te sientes</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Pregunta {currentStep + 1} de {survey.questions.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card p-6 sm:p-8">{renderQuestion()}</div>

      <div className="flex justify-between mt-6 gap-4">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="btn-secondary flex-1 sm:flex-none"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
        </button>

        {isLastStep ? (
          <button
            onClick={handleNext}
            disabled={!isAnswered && currentQuestion?.is_required || submitting}
            className="btn-primary flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Enviando...
              </>
            ) : (
              <>
                Enviar <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isAnswered && currentQuestion?.is_required}
            className="btn-primary flex-1 sm:flex-none ml-auto"
          >
            Siguiente <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Confirmar envío</h3>
            <p className="text-gray-600 text-center mb-6">
              ¿Estás seguro de enviar tus respuestas? No podrás modificarlas después.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : 'Sí, enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import { MessageSquare, Send, AlertCircle, X, Loader2, CheckCircle } from 'lucide-react'

const REQUEST_TYPES = [
  { value: 'request_support', label: 'Quiero apoyo emocional', description: 'Necesito hablar con alguien sobre cómo me siento', icon: MessageSquare },
  { value: 'request_contact', label: 'Quiero que me contacten', description: 'Me gustaría que el psicólogo me busque para conversar', icon: Send },
  { value: 'anonymous_message', label: 'Quiero contar algo (anónimo)', description: 'Puedo compartir algo sin dar mi nombre', icon: AlertCircle },
]

export function StudentSupport() {
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async () => {
    if (!user?.student_profile || !selectedType) return
    
    setSubmitting(true)
    try {
      await api.post('/support-requests', {
        student_id: user.student_profile.id,
        request_type: selectedType,
        message: message.trim() || undefined,
        is_anonymous: selectedType === 'anonymous_message',
      })
      toast.success('Tu solicitud ha sido enviada. El equipo de orientación la revisará pronto.')
      setSelectedType(null)
      setMessage('')
      setShowConfirm(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'No se pudo enviar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user?.student_profile) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600">Perfil de estudiante no encontrado</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">¿Necesitas hablar con alguien?</h1>
        <p className="text-gray-600 mt-1">
          Elige una opción y el equipo de orientación te responderá lo antes posible.
        </p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Tipo de solicitud">
        {REQUEST_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={selectedType === type.value}
            onClick={() => setSelectedType(type.value)}
            className={cn(
              'w-full p-4 rounded-xl border-2 transition-all text-left flex items-start gap-4',
              selectedType === type.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              selectedType === type.value ? 'bg-accent-400 text-white' : 'bg-gray-100 text-gray-600'
            )}>
              <type.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{type.label}</p>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            </div>
            {selectedType === type.value && (
              <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="card p-6 animate-slide-in">
          {selectedType === 'anonymous_message' && (
            <div className="mb-4 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-400 leading-relaxed">
                Tu mensaje es anónimo. En casos de riesgo grave, el colegio actúa conforme a la Ley 29719.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="message" className="label">
              {selectedType === 'anonymous_message' ? 'Tu mensaje (opcional)' : 'Cuéntanos qué necesitas (opcional)'}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder={selectedType === 'anonymous_message' 
                ? 'Escribe lo que quieras compartir...' 
                : 'Describe brevemente qué necesitas o cómo te sientes...'}
            />
            <p className="text-sm text-gray-500 mt-1">
              Puedes dejarlo en blanco si solo quieres que te contacten.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setSelectedType(null)}
              className="btn-secondary flex-1"
            >
              <X className="w-4 h-4 mr-2" /> Cancelar
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              <Send className="w-4 h-4 mr-2" /> Enviar solicitud
            </button>
          </div>
        </div>
      )}

      <div className="card p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">¿Es una emergencia?</h3>
            <p className="text-sm text-green-700 mt-1">
              Si tú o alguien más está en peligro inmediato, contacta a un adulto de confianza, 
              llama al 113 (Salud Mental) o al 100 (Policía) en Perú.
            </p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Confirmar envío</h3>
            <p className="text-gray-600 text-center mb-6">
              {selectedType === 'anonymous_message' 
                ? 'Tu mensaje anónimo será enviado al equipo de orientación.'
                : 'El equipo de orientación recibirá tu solicitud y te contactará pronto.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Sí, enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
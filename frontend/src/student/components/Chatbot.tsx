import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { MessageCircle, X, Send, Bot, User, Heart } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'bot' | 'user'
  timestamp: Date
  options?: QuickOption[]
}

interface QuickOption {
  label: string
  action: 'reply' | 'link' | 'call'
  value: string
}

const RESPONSES: Record<string, { text: string; options?: QuickOption[] }> = {
  greeting: {
    text: '¡Hola! 👋 Soy Pulso, tu asistente de bienestar. ¿En qué puedo ayudarte hoy?',
    options: [
      { label: '¿Qué es Pulso Digital?', action: 'reply', value: 'que_es' },
      { label: '¿Quién ve mis respuestas?', action: 'reply', value: 'privacidad' },
      { label: 'Necesito ayuda', action: 'reply', value: 'ayuda' },
      { label: 'Recursos de bienestar', action: 'reply', value: 'recursos' },
    ],
  },
  que_es: {
    text: 'Pulso Digital es una plataforma para que tú puedas expresar cómo te sientes. Cada semana haces un check-in rápido y tu psicólogo escolar puede ver si hay algo que necesita atención. ¡No estás solo/a!',
    options: [
      { label: '¿Cómo funciona?', action: 'reply', value: 'como_funciona' },
      { label: '¿Es anónimo?', action: 'reply', value: 'privacidad' },
    ],
  },
  como_funciona: {
    text: '1️⃣ Haces un check-in semanal (emoji + slider, toma 2 min)\n2️⃣ Tu psicólogo ve cómo va tu bienestar\n3️⃣ Si hay algo importante, te contacta\n\nTambién puedes hacer un check-in rápido cada día que inicies sesión.',
    options: [
      { label: 'Empezar check-in semanal', action: 'link', value: '/pulso/checkin' },
      { label: 'Ver mi historial', action: 'link', value: '/pulso/historial' },
    ],
  },
  privacidad: {
    text: 'Tus respuestas son confidenciales. Solo tu psicólogo escolar asignado puede ver tu información. Si hay riesgo grave, el colegio tiene obligación legal de actuar (Ley 29719), pero siempre buscando tu bienestar.',
    options: [
      { label: 'Más sobre confidencialidad', action: 'reply', value: 'confidencialidad' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  confidencialidad: {
    text: 'Tu psicólogo es quien decide si es necesario contactar a otros profesionales o tu familia. La idea es ayudarte, no juzgarte. Si tienes dudas, puedes preguntarle directamente.',
    options: [
      { label: 'Hablar con el psicólogo', action: 'link', value: '/ayuda' },
    ],
  },
  ayuda: {
    text: 'Entiendo que necesitas apoyo. Puedo ayudarte de varias formas:',
    options: [
      { label: '💬 Hablar con alguien', action: 'link', value: '/ayuda' },
      { label: '📞 Línea de crisis (113)', action: 'call', value: '113' },
      { label: '🛡️ Emergencia (100)', action: 'call', value: '100' },
    ],
  },
  emergencia: {
    text: 'Si estás en peligro inmediato:\n\n🚨 Llama al 100 (Policía)\n📞 Salud Mental: 113\n🏥 Acude al hospital más cercano\n\nNo estás solo/a. Hay ayuda disponible.',
    options: [
      { label: 'Llamar al 113', action: 'call', value: '113' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  recursos: {
    text: 'Aquí tienes algunas técnicas que pueden ayudarte:',
    options: [
      { label: '🧘 Respiración 4-7-8', action: 'reply', value: 'respiracion' },
      { label: ' grounding 5-4-3-2-1', action: 'reply', value: 'grounding' },
      { label: '😴 Higiene del sueño', action: 'reply', value: 'sueno' },
      { label: '💪 Autoestima', action: 'reply', value: 'autoestima' },
    ],
  },
  respiracion: {
    text: 'Respiración 4-7-8:\n\n1️⃣ Inhala por la nariz contando hasta 4\n2️⃣ Sostén contando hasta 7\n3️⃣ Exhala por la boca contando hasta 8\n4️⃣ Repite 3-4 veces\n\nAyuda a reducir ansiedad y mejorar el sueño.',
    options: [
      { label: 'Más técnicas', action: 'reply', value: 'recursos' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  grounding: {
    text: 'Grounding 5-4-3-2-1:\n\n👀 5 cosas que ves\n👂 4 cosas que escuchas\n✋ 3 cosas que tocas\n👃 2 cosas que hueles\n👅 1 cosa que saboreas\n\nTe ayuda a volver al momento presente cuando estás ansioso/a.',
    options: [
      { label: 'Más técnicas', action: 'reply', value: 'recursos' },
    ],
  },
  sueno: {
    text: 'Higiene del sueño:\n\n🌙 Acuéstate y levántate a la misma hora\n📱 Evita pantallas 1h antes de dormir\n☕ No café después de las 2pm\n🛏️ Tu cama es solo para dormir\n🌡️ Habitación fresca y oscura\n\nUn buen descanso es clave para tu bienestar.',
    options: [
      { label: 'Más técnicas', action: 'reply', value: 'recursos' },
    ],
  },
  autoestima: {
    text: 'Ejercicio de autoestima:\n\n✍️ Escribe 3 cosas buenas que hiciste hoy\n💪 Haz algo que te guste por 15 min\n🙏 Agradece a alguien que quieras\n🌟 Recuerda un logro del que estés orgulloso/a\n\nCada pequeño paso cuenta.',
    options: [
      { label: 'Más técnicas', action: 'reply', value: 'recursos' },
    ],
  },
  default: {
    text: 'No estoy seguro de entender. ¿Puedes preguntar de otra forma? Estoy aquí para ayudarte con información sobre Pulso Digital, técnicas de bienestar o si necesitas apoyo.',
    options: [
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
      { label: 'Necesito ayuda', action: 'reply', value: 'ayuda' },
    ],
  },
}

function matchIntent(input: string): string {
  const lower = input.toLowerCase()
  if (lower.match(/hola|hey|buenos?|buenas?/)) return 'greeting'
  if (lower.match(/qué es|que es|como funciona|cómo funciona/)) return 'que_es'
  if (lower.match(/privacidad|anonimo|anónimo|quién ve|quien ve|confiden/)) return 'privacidad'
  if (lower.match(/ayuda|necesito|apoyo|hablar|siento|triste|mal|ansiedad/)) return 'ayuda'
  if (lower.match(/emergencia|peligro|urgente|suicid|lastimar|hacerme daño/)) return 'emergencia'
  if (lower.match(/recurso|técnica|consejo|ejercicio|respirar|dormir|sueño|autoestima/)) return 'recursos'
  if (lower.match(/respira|respiracion|ansied/)) return 'respiracion'
  if (lower.match(/grounding|presente|momento/)) return 'grounding'
  if (lower.match(/dormi|dormir|sueño|insomnio/)) return 'sueno'
  if (lower.match(/autoestima|valor|orgullo|logro/)) return 'autoestima'
  return 'default'
}

export function Chatbot() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: '1',
        text: RESPONSES.greeting.text,
        sender: 'bot',
        timestamp: new Date(),
        options: RESPONSES.greeting.options,
      }
      setMessages([greeting])
    }
  }, [isOpen])

  const handleSend = (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const intent = matchIntent(text)
      const response = RESPONSES[intent] || RESPONSES.default
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        options: response.options,
      }
      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 800 + Math.random() * 700)
  }

  const handleQuickOption = (option: QuickOption) => {
    if (option.action === 'link') {
      navigate(option.value)
      setIsOpen(false)
      return
    }
    if (option.action === 'call') {
      window.location.href = `tel:${option.value}`
      return
    }
    handleSend(option.label)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300',
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-primary-600 hover:bg-primary-700 hover:scale-110'
        )}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat de ayuda'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 140px)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Pulso Asistente</h3>
              <p className="text-primary-100 text-xs">Siempre aquí para ti</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-3', msg.sender === 'user' && 'flex-row-reverse')}>
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.sender === 'bot' ? 'bg-primary-100' : 'bg-gray-200'
                )}>
                  {msg.sender === 'bot' ? (
                    <Bot className="w-4 h-4 text-primary-600" />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  msg.sender === 'bot'
                    ? 'bg-white border border-gray-100 text-gray-800'
                    : 'bg-primary-600 text-white'
                )}>
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  {msg.options && msg.sender === 'bot' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickOption(opt)}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded-full border transition-colors',
                            'border-primary-200 text-primary-700 hover:bg-primary-50'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions bar */}
          <div className="border-t border-gray-100 p-2 bg-white">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/ayuda')}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Quiero apoyo"
              >
                <Heart className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

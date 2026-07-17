import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Send, Bot, User, Heart, Phone, ExternalLink, Sparkles } from 'lucide-react'

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
    text: 'Hola. Soy Pulso, tu asistente de bienestar. Estoy aqui para ayudarte con informacion sobre la plataforma, tecnicas de bienestar o si necesitas apoyo.',
    options: [
      { label: 'Que es Pulso Digital?', action: 'reply', value: 'que_es' },
      { label: 'Quien ve mis respuestas?', action: 'reply', value: 'privacidad' },
      { label: 'Necesito ayuda', action: 'reply', value: 'ayuda' },
      { label: 'Recursos de bienestar', action: 'reply', value: 'recursos' },
    ],
  },
  que_es: {
    text: 'Pulso Digital es una plataforma para que puedas expresar como te sientes. Cada semana haces un check-in rapido y tu psicologo escolar puede ver si hay algo que necesita atencion.',
    options: [
      { label: 'Como funciona?', action: 'reply', value: 'como_funciona' },
      { label: 'Es anonimo?', action: 'reply', value: 'privacidad' },
    ],
  },
  como_funciona: {
    text: '1. Haces un check-in semanal.\n2. Tu psicologo ve como va tu bienestar.\n3. Si hay algo importante, te contacta.\n\nTambien puedes hacer un check-in rapido cada dia que inicies sesion.',
    options: [
      { label: 'Empezar check-in semanal', action: 'link', value: '/pulso/checkin' },
      { label: 'Ver mi historial', action: 'link', value: '/pulso/historial' },
    ],
  },
  privacidad: {
    text: 'Tus respuestas son confidenciales. Solo tu psicologo escolar asignado puede ver tu informacion. Si hay riesgo grave, el colegio tiene obligacion legal de actuar, pero siempre buscando tu bienestar.',
    options: [
      { label: 'Mas sobre confidencialidad', action: 'reply', value: 'confidencialidad' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  confidencialidad: {
    text: 'Tu psicologo decide si es necesario contactar a otros profesionales o a tu familia. La idea es ayudarte, no juzgarte.',
    options: [
      { label: 'Hablar con el psicologo', action: 'link', value: '/ayuda' },
    ],
  },
  ayuda: {
    text: 'Entiendo que necesitas apoyo. Puedo ayudarte de varias formas:',
    options: [
      { label: 'Hablar con alguien', action: 'link', value: '/ayuda' },
      { label: 'Linea de crisis (113)', action: 'call', value: '113' },
      { label: 'Emergencia (100)', action: 'call', value: '100' },
    ],
  },
  emergencia: {
    text: 'Si estas en peligro inmediato:\n\nLlama al 100\nSalud Mental: 113\nAcude al hospital mas cercano\n\nNo estas solo/a.',
    options: [
      { label: 'Llamar al 113', action: 'call', value: '113' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  recursos: {
    text: 'Aqui tienes algunas tecnicas que pueden ayudarte:',
    options: [
      { label: 'Respiracion 4-7-8', action: 'reply', value: 'respiracion' },
      { label: 'Grounding 5-4-3-2-1', action: 'reply', value: 'grounding' },
      { label: 'Higiene del sueno', action: 'reply', value: 'sueno' },
      { label: 'Autoestima', action: 'reply', value: 'autoestima' },
    ],
  },
  respiracion: {
    text: 'Respiracion 4-7-8:\n\n1. Inhala por la nariz contando hasta 4\n2. Sosten contando hasta 7\n3. Exhala por la boca contando hasta 8\n4. Repite 3 o 4 veces',
    options: [
      { label: 'Mas tecnicas', action: 'reply', value: 'recursos' },
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
    ],
  },
  grounding: {
    text: 'Grounding 5-4-3-2-1:\n\n5 cosas que ves\n4 cosas que escuchas\n3 cosas que tocas\n2 cosas que hueles\n1 cosa que saboreas',
    options: [{ label: 'Mas tecnicas', action: 'reply', value: 'recursos' }],
  },
  sueno: {
    text: 'Higiene del sueno:\n\nAcuestate y levantate a la misma hora\nEvita pantallas 1h antes de dormir\nNo cafe despues de las 2pm\nTu cama es solo para dormir',
    options: [{ label: 'Mas tecnicas', action: 'reply', value: 'recursos' }],
  },
  autoestima: {
    text: 'Ejercicio de autoestima:\n\nEscribe 3 cosas buenas que hiciste hoy\nHaz algo que te guste por 15 min\nAgradece a alguien que quieras\nRecuerda un logro del que estes orgulloso/a',
    options: [{ label: 'Mas tecnicas', action: 'reply', value: 'recursos' }],
  },
  default: {
    text: 'No estoy seguro de entender. Puedes preguntar sobre Pulso Digital, tecnicas de bienestar o si necesitas apoyo.',
    options: [
      { label: 'Volver al inicio', action: 'reply', value: 'greeting' },
      { label: 'Necesito ayuda', action: 'reply', value: 'ayuda' },
    ],
  },
}

function matchIntent(input: string): string {
  const lower = input.toLowerCase()
  if (lower.match(/hola|hey|buenos?|buenas?/)) return 'greeting'
  if (lower.match(/que es|como funciona/)) return 'que_es'
  if (lower.match(/privacidad|anonimo|quien ve|confiden/)) return 'privacidad'
  if (lower.match(/ayuda|necesito|apoyo|hablar|siento|triste|mal|ansiedad/)) return 'ayuda'
  if (lower.match(/emergencia|peligro|urgente|suicid|lastimar|hacerme dano/)) return 'emergencia'
  if (lower.match(/recurso|tecnica|consejo|ejercicio|respirar|dormir|sueno|autoestima/)) return 'recursos'
  if (lower.match(/respira|respiracion|ansied/)) return 'respiracion'
  if (lower.match(/grounding|presente|momento/)) return 'grounding'
  if (lower.match(/dormi|dormir|sueno|insomnio/)) return 'sueno'
  if (lower.match(/autoestima|valor|orgullo|logro/)) return 'autoestima'
  return 'default'
}

const QUICK_STARTERS = [
  'Que es Pulso Digital?',
  'Es anonimo?',
  'Tecnicas de bienestar',
  'Necesito ayuda',
]

export function Chatbot() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: RESPONSES.greeting.text,
          sender: 'bot',
          timestamp: new Date(),
          options: RESPONSES.greeting.options,
        },
      ])
    }
    inputRef.current?.focus()
  }, [messages.length])

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

    window.setTimeout(() => {
      const response = RESPONSES[matchIntent(text)] || RESPONSES.default
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: response.text,
          sender: 'bot',
          timestamp: new Date(),
          options: response.options,
        },
      ])
      setIsTyping(false)
    }, 800)
  }

  const handleQuickOption = (option: QuickOption) => {
    if (option.action === 'link') {
      navigate(option.value)
      return
    }
    if (option.action === 'call') {
      window.location.href = `tel:${option.value}`
      return
    }
    handleSend(option.label)
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[36rem] flex-col gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Bot className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Pulso Asistente</h1>
            <p className="text-sm text-gray-500">Un espacio completo para orientarte, contenerte y llevarte a la accion correcta.</p>
          </div>
          <a href="tel:113" className="hidden rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 sm:flex sm:items-center sm:gap-2">
            <Phone className="h-4 w-4" /> Crisis 113
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.sender === 'bot' && (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                  <Bot className="h-5 w-5 text-primary-600" />
                </div>
              )}
              <div className={cn('max-w-[85%] rounded-2xl px-5 py-3', msg.sender === 'bot' ? 'border border-gray-200 bg-white text-gray-800' : 'bg-primary-600 text-white')}>
                <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
                {msg.options && msg.sender === 'bot' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickOption(opt)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          opt.action === 'call'
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : opt.action === 'link'
                              ? 'border-primary-200 text-primary-700 hover:bg-primary-50'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {opt.action === 'call' && <Phone className="mr-1 inline h-3 w-3" />}
                        {opt.action === 'link' && <ExternalLink className="mr-1 inline h-3 w-3" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.sender === 'user' && (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                <Bot className="h-5 w-5 text-primary-600" />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {QUICK_STARTERS.map((starter) => (
            <button
              key={starter}
              onClick={() => handleSend(starter)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Sparkles className="h-4 w-4 text-primary-500" />
              {starter}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ayuda')}
            className="rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
            title="Quiero apoyo"
          >
            <Heart className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="rounded-xl bg-primary-600 p-2.5 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

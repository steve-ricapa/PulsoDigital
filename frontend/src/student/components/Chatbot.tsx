import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Send, Bot, User, Heart, Phone } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'bot' | 'user'
  timestamp: Date
}

export function Chatbot() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { chatSessionId, setChatSessionId } = useAuthStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const createSession = useCallback(async () => {
    if (useAuthStore.getState().isDemo) {
      setSessionReady(true)
      return
    }
    try {
      const res = await api.post('/chat/session')
      const sid = res.data.session_id
      setChatSessionId(sid)
      setSessionReady(true)
    } catch {
      setError('No se pudo iniciar el chat. Intenta recargar la pagina.')
    }
  }, [setChatSessionId])

  useEffect(() => {
    let cleanupSid: string | null = null
    if (chatSessionId) {
      setSessionReady(true)
      cleanupSid = chatSessionId
    } else {
      createSession()
    }
    inputRef.current?.focus()
    return () => {
      if (cleanupSid && !useAuthStore.getState().isDemo) {
        api.delete(`/chat/session/${cleanupSid}`).catch(() => {})
      }
    }
  }, [chatSessionId, createSession])

  useEffect(() => {
    if (messages.length === 0 && sessionReady) {
      const isDemo = useAuthStore.getState().isDemo
      if (isDemo) {
        setMessages([{
          id: '1',
          text: 'Hola. Soy Pulso, tu asistente de bienestar. Estoy aqui para escucharte y orientarte. Puedes contarme como te sientes.',
          sender: 'bot',
          timestamp: new Date(),
        }])
      } else {
        setMessages([{
          id: '1',
          text: 'Hola. Soy Pulso, tu asistente de bienestar. Estoy aqui para escucharte y orientarte. Puedes contarme como te sientes.',
          sender: 'bot',
          timestamp: new Date(),
        }])
      }
    }
  }, [messages.length, sessionReady])

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setError(null)

    const isDemo = useAuthStore.getState().isDemo

    if (isDemo) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: 'Este es un modo demo. En produccion, tu mensaje seria procesado por el asistente de bienestar.',
          sender: 'bot',
          timestamp: new Date(),
        }])
        setIsTyping(false)
      }, 800)
      return
    }

    const currentSessionId = useAuthStore.getState().chatSessionId

    if (!currentSessionId) {
      setError('Sesion no disponible. Intenta recargar la pagina.')
      setIsTyping(false)
      return
    }

    try {
      const res = await api.post('/chat/message', {
        session_id: currentSessionId,
        message: text.trim(),
      })
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: res.data.message,
        sender: 'bot',
        timestamp: new Date(),
      }])
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404 || status === 410) {
        setError('La sesion expiro. Creando nueva sesion...')
        setChatSessionId(null)
        await createSession()
        setError(null)
      } else if (status === 502) {
        setError('El asistente no esta disponible temporalmente. Intenta de nuevo.')
      } else {
        setError('Error al enviar el mensaje. Intenta de nuevo.')
      }
    } finally {
      setIsTyping(false)
    }
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
            <p className="text-sm text-gray-500">Un espacio para orientarte y contenerte.</p>
          </div>
          <a href="tel:113" className="hidden rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 sm:flex sm:items-center sm:gap-2">
            <Phone className="h-4 w-4" /> Crisis 113
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex gap-3', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.sender === 'bot' && (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                  <Bot className="h-5 w-5 text-primary-600" />
                </div>
              )}
              <div className={cn('max-w-[85%] rounded-2xl px-5 py-3', msg.sender === 'bot' ? 'border border-gray-200 bg-white text-gray-800' : 'bg-primary-600 text-white')}>
                <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
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

          {error && (
            <div className="mx-auto max-w-md rounded-xl bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-700">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder="Escribe tu mensaje..."
            disabled={isTyping}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="rounded-xl bg-primary-600 p-2.5 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Shield, GraduationCap, Stethoscope } from 'lucide-react'
import { cn } from '../../lib/utils'

const DEMO_PROFILES = [
  {
    role: 'student' as const,
    label: 'Estudiante',
    description: 'Check-in, historial, pedir apoyo',
    email: 'estudiante@colegio.edu',
    icon: GraduationCap,
    color: 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100',
  },
  {
    role: 'psychologist' as const,
    label: 'Psicólogo',
    description: 'Dashboard, alertas, intervenciones',
    email: 'psicologo@colegio.edu',
    icon: Stethoscope,
    color: 'bg-lavender-50 border-lavender-200 text-lavender-700 hover:bg-lavender-100',
  },
]

export function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!email) newErrors.email = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Correo inválido'
    if (!password) newErrors.password = 'La contraseña es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      toast.success('Bienvenido a Pulso Digital')
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'student') navigate('/pulso')
      else navigate('/psicologo/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Credenciales inválidas'
      toast.error(message)
      setErrors({ password: message })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (role: 'student' | 'psychologist') => {
    const profile = DEMO_PROFILES.find(p => p.role === role)
    if (!profile) return
    setLoading(true)
    try {
      await login(profile.email, '12345678')
      toast.success(`Bienvenido, ${profile.label}`)
      if (role === 'student') navigate('/pulso')
      else navigate('/psicologo/dashboard')
    } catch {
      toast.error('No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleFillCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('12345678')
    setErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-200">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2A3B47]">Pulso Digital</h1>
          <p className="text-[#2A3B47]/75 mt-2">Plataforma de bienestar escolar</p>
        </div>

        <div className="card p-8 bg-white border border-primary-100 shadow-xl shadow-primary-50/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="label text-[#2A3B47] font-semibold">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn('input border-primary-200 focus:ring-primary-400 focus:border-transparent transition-all', errors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label text-[#2A3B47] font-semibold">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn('input pr-12 border-primary-200 focus:ring-primary-400 focus:border-transparent transition-all', errors.password && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2A3B47]"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5 mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="my-6 border-t border-primary-100" />

          <div>
            <p className="text-sm text-[#2A3B47]/65 text-center mb-3 font-semibold">Acceso rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={profile.role}
                  onClick={() => handleQuickLogin(profile.role)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs',
                    profile.color
                  )}
                >
                  <profile.icon className="w-5 h-5" />
                  <span className="text-sm font-bold">{profile.label}</span>
                  <span className="text-[10px] leading-tight opacity-80 font-medium">{profile.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="my-6 border-t border-primary-100" />

          <div>
            <p className="text-sm text-[#2A3B47]/65 text-center mb-3 font-semibold">¿O autocompletar credenciales?</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={`fill-${profile.role}`}
                  onClick={() => handleFillCredentials(profile.email)}
                  className="text-xs px-3 py-2 rounded-xl border border-primary-100 text-[#2A3B47]/80 hover:bg-primary-50/50 hover:border-primary-200 transition-all font-medium cursor-pointer"
                >
                  <span className="font-bold">{profile.label}</span>
                  <span className="block text-[#2A3B47]/60 mt-0.5">{profile.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-[#2A3B47]/60 mt-6">
          ¿Necesitas ayuda? Contacta al administrador de tu colegio
        </p>
      </div>
    </div>
  )
}

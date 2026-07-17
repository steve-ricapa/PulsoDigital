import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Shield, AlertCircle, GraduationCap, Stethoscope, School, Crown } from 'lucide-react'
import { cn } from '../../lib/utils'

const DEMO_PROFILES = [
  {
    role: 'student' as const,
    label: 'Estudiante',
    description: 'Check-in, historial, pedir apoyo',
    email: 'estudiante@colegio.edu',
    icon: GraduationCap,
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  },
  {
    role: 'psychologist' as const,
    label: 'Psicólogo',
    description: 'Dashboard, alertas, intervenciones',
    email: 'psicologo@colegio.edu',
    icon: Stethoscope,
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  },
  {
    role: 'school_admin' as const,
    label: 'Admin Colegio',
    description: 'Gestión escolar, reportes',
    email: 'admin@colegio.edu',
    icon: School,
    color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  },
  {
    role: 'admin' as const,
    label: 'Super Admin',
    description: 'Configuración global, ML',
    email: 'superadmin@pulsodigital.edu',
    icon: Crown,
    color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
  },
]

export function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loginDemo = useAuthStore((s) => s.loginDemo)
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
      else if (currentUser?.role === 'psychologist') navigate('/psicologo/dashboard')
      else navigate('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Credenciales inválidas'
      toast.error(message)
      setErrors({ password: message })
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (role: 'student' | 'psychologist' | 'school_admin' | 'admin') => {
    loginDemo(role)
    toast.success(`Modo demo: ${DEMO_PROFILES.find(p => p.role === role)?.label}`)
    if (role === 'student') navigate('/pulso')
    else if (role === 'psychologist') navigate('/psicologo/dashboard')
    else navigate('/dashboard')
  }

  const handleFillCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('12345678')
    setErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Pulso Digital</h1>
          <p className="text-gray-600 mt-2">Plataforma de bienestar escolar</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn('input', errors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn('input pr-12', errors.password && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="btn-primary w-full py-3"
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

          <div className="my-6 border-t border-gray-200" />

          <div>
            <p className="text-sm text-gray-500 text-center mb-3 font-medium">Acceso rápido (modo demo)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={profile.role}
                  onClick={() => handleDemoLogin(profile.role)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all cursor-pointer',
                    profile.color
                  )}
                >
                  <profile.icon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{profile.label}</span>
                  <span className="text-[10px] leading-tight opacity-75">{profile.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="my-6 border-t border-gray-200" />

          <div>
            <p className="text-sm text-gray-500 text-center mb-3 font-medium">¿O autocompletar credenciales?</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PROFILES.map((profile) => (
                <button
                  key={`fill-${profile.role}`}
                  onClick={() => handleFillCredentials(profile.email)}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <span className="font-medium">{profile.label}</span>
                  <span className="block text-gray-400 mt-0.5">{profile.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Importante:</strong> Si detectamos una situación de riesgo grave para tu seguridad o la de otros,
                estamos obligados por ley a actuar y la confidencialidad tiene límites (Ley 29719).
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Necesitas ayuda? Contacta al administrador de tu colegio
        </p>
      </div>
    </div>
  )
}

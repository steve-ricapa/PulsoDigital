import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  ArrowRight, 
  Sparkles, 
  MessageCircle, 
  ClipboardList, 
  Brain, 
  Users, 
  Lock,
  LineChart,
  Eye,
  Sliders,
  CheckCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { MLPipelineAnimation } from '../components/MLPipelineAnimation'

export function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const handleStart = () => {
    if (isAuthenticated) {
      const user = useAuthStore.getState().user
      if (user?.role === 'student') navigate('/pulso')
      else navigate('/psicologo/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-[#2A3B47] flex flex-col selection:bg-primary-100">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-md shadow-primary-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2A3B47]">Pulso Digital</span>
          </div>
          <button 
            onClick={handleStart}
            className="btn-primary flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-semibold text-sm"
          >
            {isAuthenticated ? 'Ir a mi panel' : 'Iniciar Sesión'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        {/* Soft decorative background circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-lavender-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 text-primary-800 text-xs font-bold mb-6 border border-primary-200">
            <Sparkles className="w-3.5 h-3.5 text-primary-600 animate-pulse" />
            <span>Bienestar Escolar Seguro y Empático</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#2A3B47] max-w-4xl mx-auto leading-[1.15] mb-6">
            Entendiendo el bienestar escolar a través de la prevención activa
          </h1>

          <p className="text-lg md:text-xl text-[#2A3B47]/80 max-w-2xl mx-auto leading-relaxed mb-10">
            Pulso Digital es la herramienta integral para psicólogos y estudiantes que facilita el seguimiento socioemocional oportuno, seguro y libre de estigmas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-4 bg-accent-400 text-white font-bold rounded-xl hover:bg-accent-500 shadow-lg shadow-accent-200 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
            >
              Comenzar ahora
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Detailed Machine Learning Explanation (Callout & Deep Dive) */}
      <section className="py-20 bg-white border-y border-primary-100 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mx-auto mb-4">
              <Brain className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-[#2A3B47] mb-4">¿Cómo funciona nuestra Inteligencia Preventiva?</h2>
            <p className="text-base text-[#2A3B47]/80">
              Un modelo predictivo robusto diseñado bajo principios de ética, privacidad y soporte profesional, traduciendo datos en alertas oportunas sin automatizar decisiones.
            </p>
          </div>

          {/* Interactive ML Pipeline Animation */}
          <div className="mb-16">
            <MLPipelineAnimation />
          </div>

          {/* Double View: For Everyone vs. For Experts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
            
            {/* View A: For Non-Techs / School Leaders */}
            <div className="bg-primary-50/40 border border-primary-100 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-100/60 px-2.5 py-1 rounded-md">Explicación Sencilla</span>
                <h3 className="text-2xl font-bold text-[#2A3B47] mt-4 mb-4">El Radar Digital del Bienestar</h3>
                <p className="text-[#2A3B47]/85 text-sm leading-relaxed mb-6">
                  Imagínalo como un radar protector. En lugar de revisar manualmente cientos de cuestionarios individuales todos los días, el sistema analiza el "pulso" socioemocional de la escuela.
                </p>
                <ul className="space-y-4 text-sm text-[#2A3B47]/80">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                    <span><strong>Conecta los puntos:</strong> Si un estudiante de repente duerme mal, sufre estrés por tareas y nota cambios en sus amistades, el radar lo detecta en conjunto.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                    <span><strong>Alerta Silenciosa:</strong> En vez de alarmar al estudiante o poner etiquetas públicas, envía una señal de "Cuidado" directamente al panel del psicólogo.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                    <span><strong>El Humano Decide:</strong> El sistema nunca toma acciones automáticas. Solo le dice al psicólogo: "Creemos que a este alumno le vendría bien conversar".</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-6 border-t border-primary-100 text-xs text-primary-600 font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary-500" />
                <span>Cumple con normativas de privacidad estudiantil.</span>
              </div>
            </div>

            {/* View B: For Techs & Psychologists */}
            <div className="bg-lavender-50/30 border border-lavender-100 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-lavender-700 bg-lavender-100/60 px-2.5 py-1 rounded-md">Especificaciones Técnicas</span>
                <h3 className="text-2xl font-bold text-[#2A3B47] mt-4 mb-4">Random Forest Classifier & Explainability</h3>
                <p className="text-[#2A3B47]/85 text-sm leading-relaxed mb-6">
                  El motor backend utiliza aprendizaje automático supervisado clásico para evaluar las dinámicas estudiantiles mediante variables estructuradas.
                </p>
                <div className="space-y-4 text-sm text-[#2A3B47]/80">
                  <div className="flex gap-4">
                    <div className="p-2 rounded-lg bg-white shadow-xs text-lavender-600 shrink-0 h-9 w-9 flex items-center justify-center">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2A3B47]">21 Features Estructurados</h4>
                      <p className="text-xs text-[#2A3B47]/70 mt-0.5">Dinámicas de edad, grado y 17 indicadores normalizados de salud mental (calidad de sueño, autopercepción, bullying y soporte familiar).</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-2 rounded-lg bg-white shadow-xs text-lavender-600 shrink-0 h-9 w-9 flex items-center justify-center">
                      <LineChart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2A3B47]">Umbrales Calibrados</h4>
                      <p className="text-xs text-[#2A3B47]/70 mt-0.5">Clasificación probabilística en tres categorías (Routine, Monitor, Flagged) usando el percentil 75 y 85 de la muestra para minimizar falsos negativos.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-2 rounded-lg bg-white shadow-xs text-lavender-600 shrink-0 h-9 w-9 flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2A3B47]">Transparencia Auditable</h4>
                      <p className="text-xs text-[#2A3B47]/70 mt-0.5">El modelo provee la importancia local de los factores (SHAP / contribución de features) para que el especialista entienda exactamente qué motivó la alerta.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-lavender-100 text-xs text-lavender-600 font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-lavender-500" />
                <span>Cero modelos generativos (LLMs). Sin sesgos dinámicos ni alucinaciones.</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#2A3B47] mb-12">Diseñado para la calma y la conexión</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-primary-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#2A3B47]">Check-in Socioemocional</h3>
              <p className="text-sm text-[#2A3B47]/80 leading-relaxed">
                Los estudiantes registran sus emociones diarias de forma simple y amigable, promoviendo el autocuidado y la reflexión diaria sin presiones.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-primary-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-lavender-100 flex items-center justify-center text-lavender-600">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#2A3B47]">Solicitudes de Apoyo</h3>
              <p className="text-sm text-[#2A3B47]/80 leading-relaxed">
                Bajo un enfoque seguro, los estudiantes pueden solicitar ayuda a través de la opción <em>"Quiero contar algo"</em> o <em>"Quiero pedir apoyo"</em>, asegurando una comunicación directa y privada.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-primary-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#2A3B47]">Panel de Decisión</h3>
              <p className="text-sm text-[#2A3B47]/80 leading-relaxed">
                El psicólogo escolar centraliza alertas estructuradas y administra intervenciones guiadas, actuando siempre como el tomador de decisiones clave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-primary-100 bg-white py-8 text-center text-sm text-[#2A3B47]/60">
        <div className="max-w-7xl mx-auto px-6">
          <p>© {new Date().getFullYear()} Pulso Digital. Todos los derechos reservados. Enfocado en la salud mental y bienestar escolar.</p>
        </div>
      </footer>
    </div>
  )
}

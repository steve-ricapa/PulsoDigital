import { useEffect, useState, useRef } from 'react'

/**
 * Animated ML Pipeline visualization for the Landing page.
 * Shows the full flow: Check-in → Feature Extraction → Random Forest → Triage Output
 * Pure CSS animations + React state for the step-by-step reveal.
 */

const FEATURES = [
  { label: 'Bienestar emocional', emoji: '💛' },
  { label: 'Sentido de pertenencia', emoji: '🤝' },
  { label: 'Calidad de sueño', emoji: '😴' },
  { label: 'Estrés académico', emoji: '📚' },
  { label: 'Relaciones con pares', emoji: '👥' },
  { label: 'Seguridad escolar', emoji: '🛡️' },
  { label: 'Autoestima', emoji: '💪' },
  { label: 'Soporte familiar', emoji: '🏠' },
]

const TREE_ROWS = [
  [1],        // root
  [2, 3],     // depth 1
  [4, 5, 6, 7], // depth 2 (leaves)
]

const TRIAGE_LEVELS = [
  { label: 'Rutina', color: 'bg-primary-100 text-primary-700 border-primary-200', desc: 'Todo en orden' },
  { label: 'Monitorear', color: 'bg-warning-100 text-warning-600 border-warning-500', desc: 'Observar de cerca' },
  { label: 'Atención', color: 'bg-accent-100 text-accent-600 border-accent-400', desc: 'Conversar pronto' },
]

export function MLPipelineAnimation() {
  const [phase, setPhase] = useState(0) // 0-4 phases
  const [activeFeature, setActiveFeature] = useState(-1)
  const [activeTreeDepth, setActiveTreeDepth] = useState(-1)
  const [activeOutput, setActiveOutput] = useState(-1)
  const [particleKey, setParticleKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Intersection observer to start animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Main animation loop
  useEffect(() => {
    if (!isVisible) return

    const timers: ReturnType<typeof setTimeout>[] = []
    const intervals: ReturnType<typeof setInterval>[] = []
    let cancelled = false

    const runCycle = () => {
      if (cancelled) return
      // Phase 0: Reset
      setPhase(0)
      setActiveFeature(-1)
      setActiveTreeDepth(-1)
      setActiveOutput(-1)
      setParticleKey(k => k + 1)

      // Phase 1: Features light up one by one
      const t1 = setTimeout(() => {
        if (cancelled) return
        setPhase(1)
        let i = 0
        const featureInterval = setInterval(() => {
          if (cancelled) return
          setActiveFeature(i)
          i++
          if (i >= FEATURES.length) {
            clearInterval(featureInterval)

            // Phase 2: Tree activates depth by depth
            const t2 = setTimeout(() => {
              if (cancelled) return
              setPhase(2)
              let d = 0
              const treeInterval = setInterval(() => {
                if (cancelled) return
                setActiveTreeDepth(d)
                d++
                if (d >= TREE_ROWS.length) {
                  clearInterval(treeInterval)

                  // Phase 3: Output appears
                  const t3 = setTimeout(() => {
                    if (cancelled) return
                    setPhase(3)
                    setActiveOutput(2) // "Atención" highlighted

                    // Phase 4: Hold, then restart
                    const t4 = setTimeout(() => {
                      if (cancelled) return
                      setPhase(4)
                      const t5 = setTimeout(runCycle, 2000)
                      timers.push(t5)
                    }, 2500)
                    timers.push(t4)
                  }, 600)
                  timers.push(t3)
                }
              }, 500)
              intervals.push(treeInterval)
            }, 400)
            timers.push(t2)
          }
        }, 150)
        intervals.push(featureInterval)
      }, 800)
      timers.push(t1)
    }

    runCycle()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      intervals.forEach(clearInterval)
    }
  }, [isVisible])

  return (
    <div ref={containerRef} className="w-full">
      {/* Pipeline labels */}
      <div className="grid grid-cols-4 gap-2 mb-6 text-center">
        {['Check-in del Estudiante', 'Extracción de Variables', 'Random Forest', 'Resultado al Psicólogo'].map((label, i) => (
          <div
            key={label}
            className={`text-xs font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg transition-all duration-500 ${
              phase >= i + 1 || (i === 0 && phase >= 0)
                ? 'text-primary-700 bg-primary-50 border border-primary-200'
                : 'text-[#2A3B47]/30 bg-surface border border-transparent'
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{['📋', '🔬', '🌲', '👩‍⚕️'][i]}</span>
          </div>
        ))}
      </div>

      {/* Main animation area */}
      <div className="relative bg-white border border-primary-100 rounded-2xl p-6 md:p-8 overflow-hidden min-h-[320px] shadow-sm">
        {/* Animated background gradient pulse */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-50/30 via-lavender-50/20 to-accent-50/30 animate-pulse" />
        </div>

        {/* Particle trails connecting phases */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" key={particleKey}>
          {phase >= 1 && (
            <>
              {/* Flow line from features to tree */}
              <line
                x1="30%" y1="50%" x2="55%" y2="50%"
                stroke="#4FA3A5"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.3"
                className="animate-dash"
              />
              {/* Flow line from tree to output */}
              {phase >= 2 && (
                <line
                  x1="70%" y1="50%" x2="90%" y2="50%"
                  stroke="#857CBF"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.3"
                  className="animate-dash"
                />
              )}
            </>
          )}
        </svg>

        <div className="relative z-10 grid grid-cols-4 gap-3 md:gap-4 items-center h-full min-h-[260px]">

          {/* Column 1: Input check-in signals */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-3xl transition-all duration-500 ${
              phase >= 1 ? 'scale-100 opacity-100 shadow-md shadow-primary-200' : 'scale-75 opacity-40'
            }`}>
              📋
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-[#2A3B47]/70 text-center leading-tight mt-1">Check-in<br/>Semanal</span>
            {/* Mini emoji bubbles floating up */}
            <div className="flex flex-wrap justify-center gap-1 mt-2 max-w-[80px]">
              {['😊', '😐', '😟', '🙂'].map((e, i) => (
                <span
                  key={i}
                  className={`text-sm transition-all duration-300 ${
                    phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                  }`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2: Feature extraction (21 features) */}
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-2 gap-1 md:gap-1.5">
              {FEATURES.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex items-center gap-1 px-1.5 py-1 md:px-2 md:py-1 rounded-lg text-[9px] md:text-[10px] font-semibold transition-all duration-300 border ${
                    activeFeature >= i
                      ? 'bg-primary-50 text-primary-700 border-primary-200 scale-100 opacity-100 shadow-xs'
                      : 'bg-surface text-[#2A3B47]/25 border-transparent scale-95 opacity-50'
                  }`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <span className="text-xs md:text-sm">{f.emoji}</span>
                  <span className="hidden md:inline truncate">{f.label}</span>
                </div>
              ))}
            </div>
            <span className={`text-[10px] font-bold mt-2 transition-all duration-500 ${
              activeFeature >= 7 ? 'text-primary-600 opacity-100' : 'text-[#2A3B47]/30 opacity-50'
            }`}>
              21 variables →
            </span>
          </div>

          {/* Column 3: Random Forest visualization */}
          <div className="flex flex-col items-center gap-2">
            {/* Tree visualization */}
            <div className="flex flex-col items-center gap-2">
              {TREE_ROWS.map((row, depth) => (
                <div key={depth} className="flex gap-1.5 md:gap-2 justify-center">
                  {row.map((nodeId) => (
                    <div
                      key={nodeId}
                      className={`rounded-lg transition-all duration-500 flex items-center justify-center ${
                        depth === 0 ? 'w-8 h-8 md:w-10 md:h-10' :
                        depth === 1 ? 'w-7 h-7 md:w-8 md:h-8' :
                        'w-5 h-5 md:w-6 md:h-6'
                      } ${
                        activeTreeDepth >= depth
                          ? depth === 0
                            ? 'bg-lavender-500 shadow-md shadow-lavender-200 scale-110'
                            : depth === 1
                            ? 'bg-lavender-400 shadow-sm shadow-lavender-200'
                            : 'bg-lavender-300'
                          : 'bg-gray-100'
                      }`}
                      style={{ transitionDelay: `${depth * 200}ms` }}
                    >
                      {depth === 0 && activeTreeDepth >= 0 && (
                        <span className="text-white text-xs md:text-sm">🌲</span>
                      )}
                      {depth === 2 && activeTreeDepth >= 2 && (
                        <span className="text-white text-[8px] md:text-[10px]">🍃</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {/* Tree connecting lines */}
              {activeTreeDepth >= 1 && (
                <div className="absolute pointer-events-none" />
              )}
            </div>
            <span className={`text-[10px] font-bold transition-all duration-500 ${
              activeTreeDepth >= 2 ? 'text-lavender-600 opacity-100' : 'text-[#2A3B47]/30 opacity-50'
            }`}>
              Clasificación →
            </span>
          </div>

          {/* Column 4: Output / Triage */}
          <div className="flex flex-col items-center gap-1.5">
            {TRIAGE_LEVELS.map((level, i) => (
              <div
                key={level.label}
                className={`w-full px-2 py-1.5 md:px-3 md:py-2 rounded-xl text-center transition-all duration-500 border-2 ${
                  phase >= 3
                    ? activeOutput === i
                      ? `${level.color} scale-105 shadow-md font-bold`
                      : `${level.color} opacity-50 scale-95`
                    : 'bg-gray-50 border-transparent text-[#2A3B47]/20 scale-90 opacity-30'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <span className="text-[10px] md:text-xs font-bold block">{level.label}</span>
                <span className="text-[8px] md:text-[10px] opacity-75 hidden md:block">{level.desc}</span>
              </div>
            ))}

            {/* Psychologist avatar */}
            <div className={`mt-2 flex flex-col items-center transition-all duration-700 ${
              phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent-100 border-2 border-accent-300 flex items-center justify-center shadow-sm">
                <span className="text-lg md:text-xl">👩‍⚕️</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-accent-600 mt-1 text-center leading-tight">Psicólogo<br/>decide</span>
            </div>
          </div>
        </div>

        {/* Floating context labels that appear at different phases */}
        {phase >= 4 && (
          <div className="absolute bottom-3 left-0 right-0 text-center animate-in">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-[10px] md:text-xs font-semibold text-primary-700">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              El modelo nunca decide por el profesional — solo ilumina el camino
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

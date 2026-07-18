import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
import { ClipboardList, Heart, LogOut, MessageCircle, MessagesSquare } from 'lucide-react'
import { DailyCheckin } from '../student/components/DailyCheckin'

export function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showDailyCheckin, setShowDailyCheckin] = useState(false)

  const navItems = [
    { path: '/pulso', label: 'Mi Pulso', icon: Heart },
    { path: '/pulso/checkin', label: 'Check-in', icon: ClipboardList },
    { path: '/pulso/chat', label: 'Chat', icon: MessagesSquare },
    { path: '/ayuda', label: 'Quiero apoyo', icon: MessageCircle },
  ]

  useEffect(() => {
    if (!user?.id || user.role !== 'student') return
    const today = new Date().toISOString().split('T')[0]
    const key = `daily-checkin-${user.id}`
    if (localStorage.getItem(key) !== today) {
      setShowDailyCheckin(true)
    }
  }, [user?.id, user?.role])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-primary-100 sticky top-0 z-40 shadow-sm shadow-primary-50/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm shadow-primary-200">
                <Heart className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#2A3B47]">Pulso Digital</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#2A3B47]/80 hidden sm:block">{user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:bg-primary-50 hover:text-[#2A3B47] transition-all"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <nav className="border-t border-primary-50/60 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-1 py-1.5 scrollbar-hide" role="tablist">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100'
                        : 'text-[#2A3B47]/70 hover:bg-primary-50/50 hover:text-[#2A3B47]'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {showDailyCheckin && <DailyCheckin onComplete={() => setShowDailyCheckin(false)} />}
    </div>
  )
}

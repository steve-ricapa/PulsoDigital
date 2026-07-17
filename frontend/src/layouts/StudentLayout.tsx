import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
import { ClipboardList, Clock, Heart, LogOut, MessageCircle } from 'lucide-react'
import { Chatbot } from '../student/components/Chatbot'

export function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { path: '/pulso', label: 'Mi Pulso', icon: Heart },
    { path: '/pulso/checkin', label: 'Check-in', icon: ClipboardList },
    { path: '/pulso/historial', label: 'Historial', icon: Clock },
    { path: '/ayuda', label: 'Quiero apoyo', icon: MessageCircle },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Pulso Digital</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <nav className="border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-1 pb-2" role="tablist">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
      <Chatbot />
    </div>
  )
}

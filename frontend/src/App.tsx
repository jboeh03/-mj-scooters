import { useState, useEffect } from 'react'
import { LayoutDashboard, Wrench, Users } from 'lucide-react'
import { isAuthenticated } from './auth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import AddToolPage from './pages/AddToolPage'
import CheckoutsPage from './pages/CheckoutsPage'

type Page = 'dashboard' | 'inventory' | 'checkouts' | 'add-tool'

const NAV: { id: Page; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'inventory', label: 'Tools', Icon: Wrench },
  { id: 'checkouts', label: 'Checkouts', Icon: Users },
]

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated())
  const [page, setPage] = useState<Page>('dashboard')

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />
  }

  if (page === 'add-tool') {
    return (
      <AddToolPage
        onBack={() => setPage('inventory')}
        onAdded={() => setPage('inventory')}
      />
    )
  }

  function navigate(p: string) {
    setPage(p as Page)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Page content */}
      <div className="pb-20">
        {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
        {page === 'inventory' && <InventoryPage onNavigate={navigate} />}
        {page === 'checkouts' && <CheckoutsPage />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 flex">
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

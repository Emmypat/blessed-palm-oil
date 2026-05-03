import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, History,
  CreditCard, Receipt, Users, X, Droplets, MoreHorizontal, LogOut,
  WifiOff, RefreshCw, CheckCircle, Bell
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSync } from '../context/SyncContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales/new', icon: ShoppingCart, label: 'New Sale' },
  { to: '/sales/history', icon: History, label: 'Sales History' },
  { to: '/receivables', icon: CreditCard, label: 'Receivables' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/receipts', icon: Receipt, label: 'Receipts' },
  { to: '/customers', icon: Users, label: 'Customers' },
]

const bottomPrimary = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/sales/history', icon: History, label: 'Sales' },
  { to: '/sales/new', icon: ShoppingCart, label: 'Sell', center: true },
  { to: '/receivables', icon: CreditCard, label: 'Debts' },
  { to: '/reminders', icon: Bell, label: 'Alerts' },
]

const moreItems = [
  { to: '/receipts', icon: Receipt, label: 'Receipts' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showSynced, setShowSynced] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()
  const { pendingCount, isSyncing, lastSyncedCount, syncAll } = useSync()

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    if (lastSyncedCount > 0) {
      setShowSynced(true)
      const t = setTimeout(() => setShowSynced(false), 4000)
      return () => clearTimeout(t)
    }
  }, [lastSyncedCount])

  const currentPage = navItems.find(item => location.pathname.startsWith(item.to))?.label || 'Dashboard'

  return (
    <div className="flex h-screen bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)} />
      )}

      {/* Sidebar — desktop always visible */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="bg-green-600 rounded-lg p-1.5">
            <Droplets size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">Blessed Palm Oil</p>
            <p className="text-xs text-slate-400">Business Manager</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1 pb-32">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-slate-700 space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-xs">{user?.username?.[0]}</span>
            </div>
            <span className="text-sm text-slate-300 truncate">{user?.username}</span>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-600 hover:text-white transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 rounded-md p-1 lg:hidden">
              <Droplets size={16} className="text-white" />
            </div>
            <h1 className="text-base font-semibold text-slate-800">{currentPage}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-semibold text-sm">{user?.username?.[0]}</span>
            </div>
            <span className="text-sm text-slate-600 hidden sm:block">{user?.username}</span>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 active:scale-95 transition-colors">
              <LogOut size={14} /> <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Offline / sync banners */}
        {!isOnline && (
          <div className="bg-slate-700 text-white text-xs px-4 py-2 flex items-center gap-2">
            <WifiOff size={13} /> You're offline — new sales will be saved and synced when connected
          </div>
        )}
        {isOnline && pendingCount > 0 && (
          <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center gap-2">
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing
              ? `Syncing ${pendingCount} pending sale${pendingCount > 1 ? 's' : ''}...`
              : `${pendingCount} sale${pendingCount > 1 ? 's' : ''} waiting to sync`}
            {!isSyncing && (
              <button onClick={syncAll} className="ml-auto underline font-semibold">Sync now</button>
            )}
          </div>
        )}
        {showSynced && (
          <div className="bg-green-600 text-white text-xs px-4 py-2 flex items-center gap-2">
            <CheckCircle size={13} /> {lastSyncedCount} sale{lastSyncedCount > 1 ? 's' : ''} synced successfully
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </main>
      </div>

      {/* More items sheet */}
      {moreOpen && (
        <div className="fixed bottom-16 right-0 left-0 z-50 lg:hidden px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-2">
            {moreItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-4 text-sm font-medium border-b last:border-0 border-slate-100 ${
                    isActive ? 'text-green-700 bg-green-50' : 'text-slate-700'
                  }`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-slate-200 flex items-center h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomPrimary.map(({ to, icon: Icon, label, center }) => {
          const isActive = location.pathname.startsWith(to)
          if (center) {
            return (
              <NavLink key={to} to={to} className="flex-1 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-5 shadow-lg ${isActive ? 'bg-green-700' : 'bg-green-600'}`}>
                  <Icon size={20} className="text-white" />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-green-700' : 'text-slate-400'}`}>{label}</span>
              </NavLink>
            )
          }
          return (
            <NavLink key={to} to={to} className="flex-1 flex flex-col items-center gap-0.5 py-1">
              <Icon size={20} className={isActive ? 'text-green-600' : 'text-slate-400'} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
            </NavLink>
          )
        })}
        <button onClick={() => setMoreOpen(!moreOpen)} className="flex-1 flex flex-col items-center gap-0.5 py-1">
          <MoreHorizontal size={20} className={moreOpen ? 'text-green-600' : 'text-slate-400'} />
          <span className={`text-[10px] font-medium ${moreOpen ? 'text-green-600' : 'text-slate-400'}`}>More</span>
        </button>
      </nav>
    </div>
  )
}

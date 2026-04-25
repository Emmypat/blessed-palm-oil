import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SyncProvider } from './context/SyncContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import NewSale from './pages/NewSale'
import SalesHistory from './pages/SalesHistory'
import Receivables from './pages/Receivables'
import Receipts from './pages/Receipts'
import Customers from './pages/Customers'
import Reminders from './pages/Reminders'

function ChangePasswordModal() {
  const { changePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await changePassword(password)
    } catch (err) {
      setError(err.message || 'Failed to change password')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Set Your Password</h2>
          <p className="text-sm text-slate-500 mt-1">You must change your password before continuing</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoFocus
              className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      {user.must_change_password && <ChangePasswordModal />}
      {children}
    </>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="sales/history" element={<SalesHistory />} />
        <Route path="receivables" element={<Receivables />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="customers" element={<Customers />} />
        <Route path="reminders" element={<Reminders />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <AppRoutes />
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

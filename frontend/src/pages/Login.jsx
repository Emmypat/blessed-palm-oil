import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-500 rounded-2xl p-4 mb-4 shadow-lg">
            <Building2 size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Blessed Palm Oil</h1>
          <p className="text-slate-500 text-sm mt-1">Business Manager</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-5">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Your name"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-60 active:scale-[0.98] transition-transform mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Blessed Palm Oil v1.0 · Powered by AWS</p>
      </div>
    </div>
  )
}

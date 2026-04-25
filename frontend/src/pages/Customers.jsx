import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, TrendingUp, X, Phone, MessageCircle, Pencil } from 'lucide-react'
import SwipeableCard from '../components/SwipeableCard'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { customersApi, analyticsApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

function cycleStatus(lastPurchaseDateStr) {
  if (!lastPurchaseDateStr) return null
  const days = Math.floor((Date.now() - new Date(lastPurchaseDateStr)) / 86400000)
  if (days <= 30) return { label: 'Active', cls: 'bg-green-100 text-green-700', days }
  if (days <= 60) return { label: 'At Risk', cls: 'bg-amber-100 text-amber-700', days }
  return { label: 'Lapsed', cls: 'bg-red-100 text-red-700', days }
}

function toIntlPhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return '234' + digits.slice(1)
  return digits
}

function PhoneButtons({ phone, small }) {
  if (!phone) return null
  const intl = toIntlPhone(phone)
  const sz = small ? 13 : 14
  return (
    <div className="flex gap-1.5">
      <a
        href={`tel:${phone}`}
        onClick={e => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 ${small ? 'text-xs' : 'text-sm'}`}
        title="Call / SMS"
      >
        <Phone size={sz} />
        {!small && <span>Call</span>}
      </a>
      <a
        href={`https://wa.me/${intl}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 active:scale-95 ${small ? 'text-xs' : 'text-sm'}`}
        title="WhatsApp"
      >
        <MessageCircle size={sz} />
        {!small && <span>WhatsApp</span>}
      </a>
    </div>
  )
}

function CustomerModal({ customer, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: customer || {} })
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{customer ? 'Edit Customer' : 'Add Customer'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input {...register('name', { required: 'Required' })} className={inputCls} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input {...register('phone')} placeholder="080xxxxxxxx" inputMode="tel" maxLength={11} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (for reminders)</label>
            <input type="email" {...register('email')} placeholder="customer@email.com" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3.5 text-sm active:bg-slate-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-green-600 text-white rounded-xl py-3.5 text-sm font-medium active:bg-green-700">
              {customer ? 'Update' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AnalyticsModal({ customer, onClose }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['customer-analytics', customer.id],
    queryFn: () => analyticsApi.getCustomerStats(customer.id).then(r => r.data),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Purchasing Cycle — {customer.name}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">
          {isLoading && <p className="text-sm text-slate-400 text-center py-4">Loading analytics...</p>}
          {stats && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Total Purchases</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stats.purchase_count}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Total Spend</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(stats.total_spend)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Avg Order Value</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(stats.avg_order_value)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Avg Days Between Orders</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {stats.avg_cycle_days ? `${stats.avg_cycle_days}d` : '—'}
                  </p>
                </div>
              </div>
              {stats.predicted_next_purchase && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs text-green-700 font-medium">Predicted Next Purchase</p>
                  <p className="text-sm font-bold text-green-800 mt-1">{formatDate(stats.predicted_next_purchase)}</p>
                </div>
              )}
              <div className={`rounded-xl p-4 border ${
                stats.status === 'active' ? 'bg-green-50 border-green-200' :
                stats.status === 'at_risk' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs font-medium text-slate-600">Customer Status</p>
                <p className={`text-sm font-bold mt-1 capitalize ${
                  stats.status === 'active' ? 'text-green-700' :
                  stats.status === 'at_risk' ? 'text-amber-700' : 'text-red-700'
                }`}>{stats.status?.replace('_', ' ')}</p>
                {stats.days_since_last_purchase != null && (
                  <p className="text-xs text-slate-500 mt-0.5">Last purchase: {stats.days_since_last_purchase} days ago</p>
                )}
              </div>
            </div>
          )}
          {!isLoading && !stats && (
            <p className="text-sm text-slate-400 text-center py-4">No purchase history available</p>
          )}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full border border-slate-300 text-slate-600 rounded-xl py-3 text-sm hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [analyticsCustomer, setAnalyticsCustomer] = useState(null)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowAdd(false); toast.success('Customer added') },
    onError: (e) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['customers']); setEditCustomer(null); toast.success('Customer updated') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 whitespace-nowrap">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        )}
        {filtered.map(customer => {
          const status = cycleStatus(customer.last_purchase_date)
          const swipeActions = [
            { label: 'Cycle', icon: <TrendingUp size={18} />, bg: 'bg-green-600', onClick: () => setAnalyticsCustomer(customer) },
            { label: 'Edit', icon: <Pencil size={18} />, bg: 'bg-slate-500', onClick: () => setEditCustomer(customer) },
          ]
          return (
            <SwipeableCard key={customer.id} actions={swipeActions}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{customer.name}</p>
                    {customer.phone && (
                      <div className="mt-1.5">
                        <p className="text-xs text-slate-500 mb-1">{customer.phone}</p>
                        <PhoneButtons phone={customer.phone} small />
                      </div>
                    )}
                    {customer.email && <p className="text-xs text-slate-400 mt-1 truncate">{customer.email}</p>}
                    {customer.last_purchase_date && (
                      <p className="text-xs text-slate-400 mt-1">Last purchase: {formatDate(customer.last_purchase_date)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {customer.balance_owed > 0
                      ? <span className="font-semibold text-red-600 text-sm">{formatCurrency(customer.balance_owed)}</span>
                      : <span className="text-xs text-green-600 font-medium">Cleared</span>
                    }
                    {customer.balance_owed > 0 && <p className="text-xs text-slate-400">owed</p>}
                    {status && (
                      <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SwipeableCard>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Last Purchase</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Balance Owed</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />No customers found
                </td></tr>
              )}
              {filtered.map(customer => {
                const status = cycleStatus(customer.last_purchase_date)
                return (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                    <td className="px-4 py-3">
                      {customer.phone
                        ? <div className="space-y-1"><p className="text-sm text-slate-600">{customer.phone}</p><PhoneButtons phone={customer.phone} small /></div>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{customer.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {customer.last_purchase_date ? formatDate(customer.last_purchase_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status
                        ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                        : <span className="text-xs text-slate-400">New</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {customer.balance_owed > 0
                        ? <span className="font-semibold text-red-600">{formatCurrency(customer.balance_owed)}</span>
                        : <span className="text-green-600 text-xs">Cleared</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setAnalyticsCustomer(customer)}
                          className="text-xs text-green-700 hover:text-green-900 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                          <TrendingUp size={11} /> Cycle
                        </button>
                        <button onClick={() => setEditCustomer(customer)}
                          className="text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">Edit</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onSave={data => createMutation.mutate(data)} />}
      {editCustomer && <CustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)}
        onSave={data => updateMutation.mutate({ id: editCustomer.id, data })} />}
      {analyticsCustomer && <AnalyticsModal customer={analyticsCustomer} onClose={() => setAnalyticsCustomer(null)} />}
    </div>
  )
}

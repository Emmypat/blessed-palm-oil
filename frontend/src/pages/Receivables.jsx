import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, DollarSign, AlertCircle, CheckCircle, XCircle, Clock, MessageCircle, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import SwipeableCard from '../components/SwipeableCard'
import { receivablesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate, groupByMonth } from '../utils/format'
import { openWhatsAppChat, waMessages } from '../utils/whatsapp'

function PaymentModal({ receivable, onClose, onRequest }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const remaining = receivable.amount_owed - receivable.amount_paid
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Record Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onRequest)} className="px-6 py-5 space-y-4">
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm text-slate-600">Customer: <strong>{receivable.customer_name}</strong></p>
            <p className="text-sm text-slate-600 mt-1">Total Owed: <strong>{formatCurrency(receivable.amount_owed)}</strong></p>
            <p className="text-sm text-slate-600">Paid: <strong>{formatCurrency(receivable.amount_paid)}</strong></p>
            <p className="text-base font-bold text-orange-700 mt-1">Balance: {formatCurrency(remaining)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-800 font-medium">Requires a second user to approve before it is recorded.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paying Now (₦)</label>
            <input type="number" step="0.01" max={remaining}
              {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' }, max: { value: remaining, message: `Max ${remaining}` } })}
              className={inputCls} />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select {...register('method', { required: true })} className={inputCls}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
            <input {...register('reference')} placeholder="Transaction reference" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit"
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600">Submit for Approval</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Receivables() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [requestReceivable, setRequestReceivable] = useState(null)
  const [filter, setFilter] = useState('unpaid')

  useEffect(() => {
    if (location.state?.filterCustomerName) {
      setSearch(location.state.filterCustomerName)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: receivables = [] } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => receivablesApi.getAll().then(r => r.data),
  })

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['pendingPayments'],
    queryFn: () => receivablesApi.getPendingPayments().then(r => r.data),
  })

  const requestMutation = useMutation({
    mutationFn: ({ id, data }) => receivablesApi.requestPayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['pendingPayments'])
      setRequestReceivable(null)
      toast.success('Payment submitted — awaiting approval from another user')
    },
    onError: (e) => toast.error(e.message),
  })

  const approveMutation = useMutation({
    mutationFn: receivablesApi.approvePayment,
    onSuccess: () => {
      qc.invalidateQueries(['receivables'])
      qc.invalidateQueries(['pendingPayments'])
      qc.invalidateQueries(['customers'])
      toast.success('Payment approved and recorded!')
    },
    onError: (e) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: receivablesApi.rejectPayment,
    onSuccess: () => {
      qc.invalidateQueries(['pendingPayments'])
      toast.success('Payment request cancelled')
    },
    onError: (e) => toast.error(e.message),
  })

  const totalOutstanding = receivables.filter(r => !r.paid).reduce((sum, r) => sum + (r.amount_owed - r.amount_paid), 0)
  const overdue = receivables.filter(r => !r.paid && new Date(r.due_date) < new Date()).length

  const pendingReceivableIds = new Set(pendingPayments.map(p => p.receivable_id))

  const filtered = receivables
    .filter(r => filter === 'all' || (filter === 'unpaid' && !r.paid) || (filter === 'paid' && r.paid))
    .filter(r => r.customer_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">

      {/* Pending payment approvals */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Pending Payment Approvals ({pendingPayments.length})</h3>
          </div>
          {pendingPayments.map(p => (
            <div key={p.id} className="bg-white rounded-lg border border-amber-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{p.customer_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatCurrency(p.amount)} · {p.method.replace('_', ' ')}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Requested by <strong>{p.requested_by}</strong></p>
                </div>
                {p.requested_by !== user?.username ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <XCircle size={12} /> Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-lg shrink-0">Awaiting 2nd user</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Open</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{receivables.filter(r => !r.paid).length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle size={12} className="text-red-500" />
            <p className="text-xs text-red-600">Overdue</p>
          </div>
          <p className="text-lg font-bold text-red-700">{overdue}</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="flex gap-2">
          {['all', 'unpaid', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-sm capitalize font-medium transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No receivables found</p>}
        {groupByMonth(filtered, 'created_at').map(([month, items]) => (
          <div key={month}>
            <div className="sticky top-0 z-10 bg-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2">{month}</div>
            {items.map(r => {
              const balance = r.amount_owed - r.amount_paid
              const isOverdue = !r.paid && new Date(r.due_date) < new Date()
              const isPending = pendingReceivableIds.has(r.id)
              const swipeActions = !r.paid && !isPending
                ? [{ label: 'Pay', icon: <DollarSign size={18} />, bg: 'bg-orange-500', onClick: () => setRequestReceivable(r) }]
                : []
              return (
                <SwipeableCard key={r.id} actions={swipeActions}>
                  <div className={`p-4 ${isOverdue ? 'border-l-4 border-red-400' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{r.customer_name}</p>
                        <button
                          onClick={() => navigate('/sales/history', { state: { searchSaleId: r.sale_id } })}
                          className="text-xs text-indigo-600 hover:underline mt-0.5">
                          Sale #{r.sale_id} →
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(balance)}</p>
                        <p className="text-xs text-slate-400">balance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${r.paid ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {r.paid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                      <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>Due: {formatDate(r.due_date)}</span>
                      {r.amount_paid > 0 && <span className="text-green-600">Paid: {formatCurrency(r.amount_paid)}</span>}
                      {isPending && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Payment pending</span>}
                    </div>
                    {!r.paid && r.customer_phone && (
                      <div className="mt-2">
                        <button
                          onClick={() => openWhatsAppChat(r.customer_phone, waMessages.paymentChase(r.customer_name, formatCurrency(r.amount_owed - r.amount_paid)))}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-medium"
                          title="Send payment reminder via WhatsApp"
                        >
                          <MessageCircle size={13} /> Chase via WhatsApp
                        </button>
                      </div>
                    )}
                    {!r.paid && !isPending && (
                      <p className="text-xs text-slate-400 mt-2">← Swipe left to record payment</p>
                    )}
                  </div>
                </SwipeableCard>
              )
            })}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sale #</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Owed</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Due</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No receivables found</td></tr>
              )}
              {groupByMonth(filtered, 'created_at').map(([month, items]) => (
                <>
                  <tr key={month} className="bg-slate-50">
                    <td colSpan={8} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{month}</td>
                  </tr>
                  {items.map(r => {
                    const balance = r.amount_owed - r.amount_paid
                    const isOverdue = !r.paid && new Date(r.due_date) < new Date()
                    const isPending = pendingReceivableIds.has(r.id)
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{r.customer_name}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate('/sales/history', { state: { searchSaleId: r.sale_id } })}
                            className="text-indigo-600 hover:underline font-mono text-sm flex items-center gap-0.5"
                          >
                            #{r.sale_id} <ExternalLink size={11} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.amount_owed)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.amount_paid)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(balance)}</td>
                        <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{formatDate(r.due_date)}</td>
                        <td className="px-4 py-3 text-center">
                          {r.paid
                            ? <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Paid</span>
                            : isPending
                              ? <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">Awaiting 2nd user</span>
                              : isOverdue
                                ? <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Overdue</span>
                                : <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">Pending</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {!r.paid && r.customer_phone && (
                              <button
                                onClick={() => openWhatsAppChat(r.customer_phone, waMessages.paymentChase(r.customer_name, formatCurrency(r.amount_owed - r.amount_paid)))}
                                className="text-xs flex items-center gap-1 text-green-600 hover:text-green-800 border border-green-200 rounded px-2 py-1"
                                title="Send payment reminder via WhatsApp"
                              >
                                <MessageCircle size={12} /> Chase
                              </button>
                            )}
                            {!r.paid && !isPending && (
                              <button onClick={() => setRequestReceivable(r)}
                                className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 border border-orange-200 rounded px-2 py-1">
                                <DollarSign size={12} /> Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {requestReceivable && (
        <PaymentModal
          receivable={requestReceivable}
          onClose={() => setRequestReceivable(null)}
          onRequest={data => requestMutation.mutate({ id: requestReceivable.id, data })}
        />
      )}
    </div>
  )
}

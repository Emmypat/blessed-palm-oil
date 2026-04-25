import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, DollarSign, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { receivablesApi } from '../services/api'
import { formatCurrency, formatDate, groupByMonth } from '../utils/format'

const MOCK_RECEIVABLES = [
  { id: 1, customer_name: 'Kofi Asante', amount_owed: 1800, amount_paid: 0, sale_id: 3, due_date: '2026-05-01', paid: false, created_at: new Date().toISOString() },
  { id: 2, customer_name: 'Ama Boateng', amount_owed: 4200, amount_paid: 2000, sale_id: 5, due_date: '2026-04-25', paid: false, created_at: new Date().toISOString() },
  { id: 3, customer_name: 'Kwame Frimpong', amount_owed: 950, amount_paid: 950, sale_id: 6, due_date: '2026-04-10', paid: true, created_at: new Date().toISOString() },
]

function PaymentModal({ receivable, onClose, onPay }) {
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
        <form onSubmit={handleSubmit(onPay)} className="px-6 py-5 space-y-4">
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm text-slate-600">Customer: <strong>{receivable.customer_name}</strong></p>
            <p className="text-sm text-slate-600 mt-1">Total Owed: <strong>{formatCurrency(receivable.amount_owed)}</strong></p>
            <p className="text-sm text-slate-600">Paid: <strong>{formatCurrency(receivable.amount_paid)}</strong></p>
            <p className="text-base font-bold text-orange-700 mt-1">Balance: {formatCurrency(remaining)}</p>
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
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Receivables() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [payReceivable, setPayReceivable] = useState(null)
  const [filter, setFilter] = useState('unpaid')

  const { data: receivables = MOCK_RECEIVABLES } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => receivablesApi.getAll().then(r => r.data),
    placeholderData: MOCK_RECEIVABLES,
  })

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => receivablesApi.recordPayment(id, data),
    onSuccess: () => { qc.invalidateQueries(['receivables']); setPayReceivable(null); toast.success('Payment recorded!') },
    onError: (e) => toast.error(e.message),
  })

  const totalOutstanding = receivables.filter(r => !r.paid).reduce((sum, r) => sum + (r.amount_owed - r.amount_paid), 0)
  const overdue = receivables.filter(r => !r.paid && new Date(r.due_date) < new Date()).length

  const filtered = receivables
    .filter(r => filter === 'all' || (filter === 'unpaid' && !r.paid) || (filter === 'paid' && r.paid))
    .filter(r => r.customer_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
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
          return (
            <div key={r.id} className={`bg-white rounded-xl border p-4 ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{r.customer_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Sale #{r.sale_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(balance)}</p>
                  <p className="text-xs text-slate-400">balance</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                <span className={`px-2 py-0.5 rounded-full font-medium ${r.paid ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {r.paid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                </span>
                <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>Due: {formatDate(r.due_date)}</span>
                {r.amount_paid > 0 && <span className="text-green-600">Paid: {formatCurrency(r.amount_paid)}</span>}
              </div>
              {!r.paid && (
                <button onClick={() => setPayReceivable(r)}
                  className="w-full py-2.5 text-sm font-medium text-white bg-orange-500 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]">
                  <DollarSign size={16} /> Record Payment
                </button>
              )}
            </div>
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
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customer_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">#{r.sale_id}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.amount_owed)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.amount_paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(balance)}</td>
                    <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.paid
                        ? <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Paid</span>
                        : isOverdue
                          ? <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Overdue</span>
                          : <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">Pending</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!r.paid && (
                        <button onClick={() => setPayReceivable(r)}
                          className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 border border-orange-200 rounded px-2 py-1 ml-auto">
                          <DollarSign size={12} /> Pay
                        </button>
                      )}
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

      {payReceivable && (
        <PaymentModal receivable={payReceivable} onClose={() => setPayReceivable(null)}
          onPay={data => payMutation.mutate({ id: payReceivable.id, data })} />
      )}
    </div>
  )
}

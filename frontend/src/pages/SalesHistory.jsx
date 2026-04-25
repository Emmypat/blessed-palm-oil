import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle, XCircle, Eye, Receipt, Clock, Trash2, CalendarClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi, receiptsApi, deletionsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDateTime, groupByDay } from '../utils/format'

const METHOD_BADGE = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  mobile_money: 'bg-purple-100 text-purple-700',
}

const STATUS_FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified',label: 'Verified' },
  { key: 'declined',label: 'Declined' },
]

function statusOf(sale) {
  if (sale.declined) return 'declined'
  if (sale.verified) return 'verified'
  return 'pending'
}

function StatusBadge({ sale }) {
  if (sale.verified)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
        <CheckCircle size={11} /> Verified
      </span>
    )
  if (sale.declined)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
        <XCircle size={11} /> Declined
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
      <Clock size={11} /> Pending
    </span>
  )
}

function SaleDetailModal({ sale, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold text-slate-800">Sale #{sale.id}</h3>
            <div className="mt-1"><StatusBadge sale={sale} /></div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 text-xl font-bold">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{sale.customer_name || 'Walk-in'}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-medium">{formatDateTime(sale.created_at)}</span></div>
            <div>
              <span className="text-slate-500">Payment:</span>
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full capitalize ${METHOD_BADGE[sale.payment_method] || ''}`}>
                {sale.payment_method?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Type:</span>
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${sale.is_credit ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {sale.is_credit ? 'Credit' : 'Paid'}
              </span>
            </div>
            {sale.is_credit && sale.due_date && (
              <div className="col-span-2 flex items-center gap-1.5 text-sm">
                <CalendarClock size={13} className="text-orange-500" />
                <span className="text-slate-500">Repayment due:</span>
                <span className="font-semibold text-orange-700">{sale.due_date}</span>
              </div>
            )}
            {sale.created_by && (
              <div><span className="text-slate-500">Recorded by:</span> <span className="font-medium">{sale.created_by}</span></div>
            )}
            {sale.verified_by && (
              <div><span className="text-slate-500">Verified by:</span> <span className="font-medium text-green-700">{sale.verified_by}</span></div>
            )}
          </div>
          {sale.items?.length > 0 && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-600">Product</th>
                    <th className="text-right px-3 py-2 text-slate-600">Qty</th>
                    <th className="text-right px-3 py-2 text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-right">{item.qty}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SalesHistory() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewSale, setViewSale] = useState(null)

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getAll().then(r => r.data),
    placeholderData: [],
  })

  const { data: pendingDeletions = [] } = useQuery({
    queryKey: ['pendingDeletions', 'sale'],
    queryFn: () => deletionsApi.getPending('sale').then(r => r.data),
  })

  const requestDeleteMutation = useMutation({
    mutationFn: ({ id, label }) => deletionsApi.request('sale', id, label),
    onSuccess: () => { qc.invalidateQueries(['pendingDeletions', 'sale']); toast.success('Delete request submitted — awaiting approval from another user') },
    onError: (e) => toast.error(e.message),
  })

  const approveDeleteMutation = useMutation({
    mutationFn: deletionsApi.approve,
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['pendingDeletions', 'sale']); qc.invalidateQueries(['inventory']); toast.success('Sale deleted') },
    onError: (e) => toast.error(e.message),
  })

  const rejectDeleteMutation = useMutation({
    mutationFn: deletionsApi.reject,
    onSuccess: () => { qc.invalidateQueries(['pendingDeletions', 'sale']); toast.success('Deletion rejected') },
    onError: (e) => toast.error(e.message),
  })

  const verifyMutation = useMutation({
    mutationFn: salesApi.verify,
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['inventory']); toast.success('Sale verified') },
    onError: (e) => toast.error(e.message),
  })

  const declineMutation = useMutation({
    mutationFn: salesApi.decline,
    onSuccess: () => { qc.invalidateQueries(['sales']); qc.invalidateQueries(['inventory']); toast.success('Sale declined — inventory restored') },
    onError: (e) => toast.error(e.message),
  })

  const resendMutation = useMutation({
    mutationFn: receiptsApi.resend,
    onSuccess: () => toast.success('Receipt resent!'),
    onError: (e) => toast.error(e.message),
  })

  // Counts per status for the tab badges
  const counts = {
    all: sales.length,
    pending:  sales.filter(s => statusOf(s) === 'pending').length,
    verified: sales.filter(s => statusOf(s) === 'verified').length,
    declined: sales.filter(s => statusOf(s) === 'declined').length,
  }

  const filtered = sales.filter(s => {
    const matchSearch =
      (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.id).includes(search)
    const matchStatus = statusFilter === 'all' || statusOf(s) === statusFilter
    return matchSearch && matchStatus
  })

  const filteredTotal = filtered.reduce((sum, s) => sum + Number(s.total || 0), 0)

  const dayGroups = groupByDay(filtered, 'created_at')

  // Shared card actions
  const SaleActions = ({ sale, mobile }) => {
    const btnBase = mobile
      ? 'flex-1 py-3 text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.97]'
      : 'text-xs flex items-center gap-1 rounded px-2 py-1'

    return (
      <>
        {!sale.verified && !sale.declined && (
          sale.created_by === user?.username ? (
            <div className={mobile ? 'flex-1 py-2 text-xs text-center text-slate-400 bg-slate-50 rounded-lg' : 'text-xs text-slate-400 italic'}>
              Awaiting 2nd user
            </div>
          ) : (
            <>
              <button onClick={() => verifyMutation.mutate(sale.id)} disabled={verifyMutation.isPending}
                className={`${btnBase} text-white bg-green-500 ${mobile ? '' : 'hover:bg-green-600'} disabled:opacity-50`}>
                <CheckCircle size={mobile ? 14 : 12} /> Verify
              </button>
              <button onClick={() => declineMutation.mutate(sale.id)} disabled={declineMutation.isPending}
                className={`${btnBase} text-white bg-red-500 ${mobile ? '' : 'hover:bg-red-600'} disabled:opacity-50`}>
                <XCircle size={mobile ? 14 : 12} /> Decline
              </button>
            </>
          )
        )}
        <button onClick={() => setViewSale(sale)}
          className={`${btnBase} text-slate-600 border border-slate-200 ${mobile ? '' : 'hover:text-slate-800'}`}>
          <Eye size={mobile ? 14 : 12} /> Details
        </button>
        {sale.customer_email && (
          <button onClick={() => resendMutation.mutate(sale.id)}
            className={`${btnBase} text-blue-600 border border-blue-200 ${mobile ? '' : 'hover:text-blue-800'}`}>
            <Receipt size={mobile ? 14 : 12} /> Receipt
          </button>
        )}
        {pendingDeleteIds.has(sale.id) ? (
          <span className={`${btnBase} text-red-500 border border-red-200 bg-red-50 cursor-default`}>
            <Trash2 size={mobile ? 14 : 12} /> Delete Pending
          </span>
        ) : (
          <button
            onClick={() => requestDeleteMutation.mutate({ id: sale.id, label: `Sale #${sale.id} — ${sale.customer_name || 'Walk-in'} (${formatCurrency(sale.total)})` })}
            disabled={requestDeleteMutation.isPending}
            className={`${btnBase} text-red-500 border border-red-200 ${mobile ? '' : 'hover:text-red-700'} disabled:opacity-50`}>
            <Trash2 size={mobile ? 14 : 12} /> Delete
          </button>
        )}
      </>
    )
  }

  const pendingDeleteIds = new Set(pendingDeletions.map(d => d.entity_id))

  return (
    <div className="space-y-3">

      {/* Pending sale deletions */}
      {pendingDeletions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">Pending Deletions ({pendingDeletions.length})</h3>
          </div>
          {pendingDeletions.map(d => (
            <div key={d.id} className="bg-white rounded-lg border border-red-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.entity_label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Requested by <strong>{d.requested_by}</strong></p>
                </div>
                {d.requested_by !== user?.username ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveDeleteMutation.mutate(d.id)} disabled={approveDeleteMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <Trash2 size={12} /> Delete
                    </button>
                    <button onClick={() => rejectDeleteMutation.mutate(d.id)} disabled={rejectDeleteMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <XCircle size={12} /> Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-lg shrink-0">Awaiting 2nd user</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer or sale ID..."
          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === key
                ? key === 'pending'  ? 'bg-amber-500 text-white'
                : key === 'verified' ? 'bg-green-500 text-white'
                : key === 'declined' ? 'bg-red-500 text-white'
                : 'bg-green-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              statusFilter === key ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>{filtered.length} sale{filtered.length !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-slate-700">{formatCurrency(filteredTotal)}</span>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-slate-500">No {statusFilter !== 'all' ? statusFilter : ''} sales found</p>
          {search && <p className="text-sm mt-1">Try a different search term</p>}
        </div>
      )}

      {/* Mobile cards */}
      <div className="sm:hidden space-y-1">
        {dayGroups.map(([day, daySales]) => (
          <div key={day}>
            <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg my-2">
              {day}
              <span className="ml-2 font-normal normal-case">
                {formatCurrency(daySales.reduce((s, x) => s + Number(x.total || 0), 0))}
              </span>
            </div>
            <div className="space-y-2">
              {daySales.map(sale => (
                <div key={sale.id} className={`bg-white rounded-xl border p-4 ${
                  sale.declined ? 'border-red-100' : sale.verified ? 'border-green-100' : 'border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{sale.customer_name || 'Walk-in'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(sale.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(sale.total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <StatusBadge sale={sale} />
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${METHOD_BADGE[sale.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                      {sale.payment_method?.replace('_', ' ')}
                    </span>
                    {sale.is_credit && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">Credit</span>}
                  </div>
                  {sale.created_by && (
                    <p className="text-xs text-slate-400 mb-2">
                      by <strong>{sale.created_by}</strong>
                      {sale.verified_by && <> · verified by <strong className="text-green-700">{sale.verified_by}</strong></>}
                    </p>
                  )}
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <SaleActions sale={sale} mobile />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayGroups.map(([day, daySales]) => (
                <>
                  <tr key={day} className="bg-slate-50">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{day}</td>
                    <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-slate-500 text-right">
                      {formatCurrency(daySales.reduce((s, x) => s + Number(x.total || 0), 0))}
                    </td>
                  </tr>
                  {daySales.map(sale => (
                    <tr key={sale.id} className={`hover:bg-slate-50 ${sale.declined ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-slate-400 font-mono">#{sale.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{sale.customer_name || 'Walk-in'}</p>
                        <p className="text-xs text-slate-400">
                          {sale.created_by && <>by {sale.created_by}</>}
                          {sale.verified_by && <span className="text-green-600"> · ✓ {sale.verified_by}</span>}
                        </p>
                        {sale.is_credit && <span className="text-xs text-orange-600">Credit</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(sale.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${METHOD_BADGE[sale.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                          {sale.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(sale.total)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge sale={sale} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <SaleActions sale={sale} mobile={false} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewSale && <SaleDetailModal sale={viewSale} onClose={() => setViewSale(null)} />}
    </div>
  )
}

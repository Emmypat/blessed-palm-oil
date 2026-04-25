import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Mail, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { receiptsApi } from '../services/api'
import { formatCurrency, formatDateTime, groupByMonth } from '../utils/format'

const MOCK_RECEIPTS = [
  { id: 1, sale_id: 1, customer_name: 'John Mensah', customer_email: 'john@example.com', total: 3200, emailed_to: 'john@example.com', sent_at: new Date().toISOString() },
  { id: 2, sale_id: 2, customer_name: 'Abena Owusu', customer_email: 'abena@example.com', total: 5600, emailed_to: null, sent_at: null },
]

export default function Receipts() {
  const [search, setSearch] = useState('')

  const { data: receipts = MOCK_RECEIPTS } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.getAll().then(r => r.data),
    placeholderData: MOCK_RECEIPTS,
  })

  const resendMutation = useMutation({
    mutationFn: receiptsApi.resend,
    onSuccess: () => toast.success('Receipt resent!'),
    onError: (e) => toast.error(e.message),
  })

  const downloadMutation = useMutation({
    mutationFn: async (id) => {
      const res = await receiptsApi.download(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = receipts.filter(r =>
    (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(r.sale_id).includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipts..."
          className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No receipts found</p>
          </div>
        )}
        {groupByMonth(filtered, 'created_at').map(([month, items]) => (
          <div key={month}>
            <div className="sticky top-0 z-10 bg-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2">{month}</div>
            {items.map(receipt => (
          <div key={receipt.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800">{receipt.customer_name || 'Walk-in'}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sale #{receipt.sale_id} · Receipt #{receipt.id}</p>
              </div>
              <span className="font-bold text-slate-800">{formatCurrency(receipt.total)}</span>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              {receipt.emailed_to
                ? <span className="flex items-center gap-1 text-blue-600"><Mail size={12} />{receipt.emailed_to}</span>
                : <span className="text-slate-400">No email on file</span>
              }
              {receipt.sent_at && <p className="text-slate-400 mt-0.5">Sent: {formatDateTime(receipt.sent_at)}</p>}
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => downloadMutation.mutate(receipt.id)}
                className="flex-1 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98]">
                <Download size={14} /> PDF
              </button>
              {receipt.customer_email && (
                <button onClick={() => resendMutation.mutate(receipt.id)} disabled={resendMutation.isPending}
                  className="flex-1 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 active:scale-[0.98]">
                  <Mail size={14} /> Resend
                </button>
              )}
            </div>
          </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Receipt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Sent To</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date Sent</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />No receipts found
                </td></tr>
              )}
              {groupByMonth(filtered, 'created_at').map(([month, items]) => (
                <>
                  <tr key={month} className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{month}</td>
                  </tr>
                  {items.map(receipt => (
                <tr key={receipt.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-500">
                    #{receipt.id} <span className="text-xs text-slate-400">(Sale #{receipt.sale_id})</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{receipt.customer_name || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {receipt.emailed_to
                      ? <span className="flex items-center gap-1"><Mail size={13} className="text-blue-400" />{receipt.emailed_to}</span>
                      : <span className="text-slate-300">No email</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(receipt.total)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {receipt.sent_at ? formatDateTime(receipt.sent_at) : <span className="text-slate-300">Not sent</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => downloadMutation.mutate(receipt.id)}
                        className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">
                        <Download size={12} /> PDF
                      </button>
                      {receipt.customer_email && (
                        <button onClick={() => resendMutation.mutate(receipt.id)} disabled={resendMutation.isPending}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 disabled:opacity-50">
                          <Mail size={12} /> Resend
                        </button>
                      )}
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
    </div>
  )
}

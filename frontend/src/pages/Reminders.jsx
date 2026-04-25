import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { remindersApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

const URGENCY = {
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, iconCls: 'text-red-500' },
  due_soon: { label: 'Due Soon', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, iconCls: 'text-amber-500' },
  upcoming: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: Bell, iconCls: 'text-blue-500' },
}

function ReminderCard({ item, onSend, sending }) {
  const u = URGENCY[item.urgency] || URGENCY.upcoming
  const UIcon = u.icon
  const balance = item.amount_owed - item.amount_paid

  return (
    <div className={`bg-white rounded-xl border p-4 ${item.urgency === 'overdue' ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${u.iconCls}`}>
            <UIcon size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.customer_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">Sale #{item.sale_id}</p>
            {item.customer_email && (
              <p className="text-xs text-slate-400 mt-0.5">{item.customer_email}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-800">{formatCurrency(balance)}</p>
          <p className="text-xs text-slate-400">balance</p>
          <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium border ${u.cls}`}>
            {u.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Due: <span className={item.urgency === 'overdue' ? 'text-red-600 font-medium' : ''}>{formatDate(item.due_date)}</span></span>
        {item.reminder_sent_at && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle size={11} /> Sent {formatDate(item.reminder_sent_at)}
          </span>
        )}
      </div>

      {item.customer_email ? (
        <button
          onClick={() => onSend(item.id)}
          disabled={sending}
          className={`mt-3 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors
            ${item.reminder_sent_at
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-60`}
        >
          <Send size={14} />
          {sending ? 'Sending...' : item.reminder_sent_at ? 'Resend Reminder' : 'Send Reminder'}
        </button>
      ) : (
        <p className="mt-3 text-xs text-center text-slate-400 py-2 bg-slate-50 rounded-xl">
          No email on file — add customer email to send reminders
        </p>
      )}
    </div>
  )
}

export default function Reminders() {
  const qc = useQueryClient()
  const [sendingId, setSendingId] = useState(null)
  const [filter, setFilter] = useState('all')

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll().then(r => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: remindersApi.send,
    onMutate: (id) => setSendingId(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['reminders'])
      toast.success('Reminder sent!')
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setSendingId(null),
  })

  const overdue = reminders.filter(r => r.urgency === 'overdue')
  const dueSoon = reminders.filter(r => r.urgency === 'due_soon')
  const upcoming = reminders.filter(r => r.urgency === 'upcoming')

  const filtered = filter === 'overdue' ? overdue
    : filter === 'due_soon' ? dueSoon
    : filter === 'upcoming' ? upcoming
    : reminders

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={13} className="text-red-500" />
            <p className="text-xs text-red-600 font-medium">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{overdue.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={13} className="text-amber-500" />
            <p className="text-xs text-amber-600 font-medium">Due Soon</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{dueSoon.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Bell size={13} className="text-blue-500" />
            <p className="text-xs text-blue-600 font-medium">Upcoming</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{upcoming.length}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: `All (${reminders.length})` },
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'due_soon', label: `Due Soon (${dueSoon.length})` },
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === key ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading && (
        <div className="text-center py-10 text-slate-400">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Loading reminders...</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle size={36} className="mx-auto mb-3 text-green-400" />
          <p className="text-sm font-medium text-slate-600">All clear!</p>
          <p className="text-xs mt-1">No outstanding payment reminders in this category</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(item => (
          <ReminderCard
            key={item.id}
            item={item}
            onSend={(id) => sendMutation.mutate(id)}
            sending={sendingId === item.id}
          />
        ))}
      </div>
    </div>
  )
}

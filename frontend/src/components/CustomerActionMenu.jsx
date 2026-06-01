import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ShoppingCart, History, CreditCard, User, X } from 'lucide-react'

export default function CustomerActionMenu({ customer, anchorRect, onClose }) {
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 220)
  const left = Math.min(anchorRect.left, window.innerWidth - 220)

  const go = (path, state) => { onClose(); navigate(path, { state }) }

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, minWidth: 210 }}
      className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm"
    >
      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
        <span className="font-semibold text-slate-800 truncate">{customer.name}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2"><X size={14} /></button>
      </div>
      <button onClick={() => go('/new-sale', { customerId: customer.id, customerName: customer.name })}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-left">
        <ShoppingCart size={15} className="text-green-600" /> New Sale
      </button>
      <button onClick={() => go('/sales/history', { filterCustomerName: customer.name })}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-left">
        <History size={15} className="text-blue-600" /> Sales History
      </button>
      <button onClick={() => go('/receivables', { filterCustomerName: customer.name })}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-left">
        <CreditCard size={15} className="text-orange-500" /> Receivables
      </button>
      <button onClick={() => go('/customers', { highlightCustomerName: customer.name })}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-left">
        <User size={15} className="text-slate-500" /> View Profile
      </button>
    </div>
  )
}

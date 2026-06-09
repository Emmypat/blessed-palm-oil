export default function QuickProductTiles({ products, onSelect }) {
  if (!products || products.length === 0) return null

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Quick Add</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {products.map((p) => {
          const lowStock = p.stock_qty <= p.reorder_level
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              disabled={p.stock_qty === 0}
              className={`
                flex flex-col items-start p-3 rounded-xl border text-left
                transition-all active:scale-95
                ${p.stock_qty === 0
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:border-green-400 hover:bg-green-50 cursor-pointer shadow-sm'}
              `}
            >
              <span className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</span>
              <span className="text-green-700 text-xs mt-1 font-medium">
                ₦{Number(p.price).toLocaleString()}
              </span>
              <span className={`text-xs mt-0.5 ${lowStock ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                {p.stock_qty === 0 ? 'Out of stock' : lowStock ? `Low: ${p.stock_qty} left` : `${p.stock_qty} in stock`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

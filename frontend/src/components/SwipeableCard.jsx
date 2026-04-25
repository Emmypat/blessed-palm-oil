import { useState, useRef } from 'react'

/**
 * SwipeableCard — swipe left to reveal action buttons.
 *
 * actions: [{ label, icon, bg (tailwind bg class), onClick }]
 */
export default function SwipeableCard({ actions, className = '', children }) {
  const [open, setOpen] = useState(false)
  const startX = useRef(null)
  const startY = useRef(null)
  const actionW = actions.length * 80

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = Math.abs(e.changedTouches[0].clientY - startY.current)
    if (dy > 25) { startX.current = null; return } // scroll, ignore
    if (dx < -55) setOpen(true)
    else if (dx > 20) setOpen(false)
    startX.current = null
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      {/* Actions strip — behind the card */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: actionW }}
      >
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => { a.onClick(); setOpen(false) }}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold active:opacity-75 ${a.bg}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {/* Sliding front panel */}
      <div
        className="relative bg-white transition-transform duration-200 ease-out"
        style={{ transform: open ? `translateX(-${actionW}px)` : 'translateX(0)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => open && setOpen(false)}
      >
        {children}
        {/* Swipe hint — thin coloured right edge */}
        {!open && (
          <div className="absolute right-0 top-3 bottom-3 w-1 rounded-full bg-slate-200 opacity-60 pointer-events-none" />
        )}
      </div>
    </div>
  )
}

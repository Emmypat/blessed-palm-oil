import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns'

export function groupByDay(items, dateField) {
  const groups = new Map()
  items.forEach(item => {
    const raw = item[dateField]
    if (!raw) return
    try {
      const d = typeof raw === 'string' ? parseISO(raw) : raw
      let key
      if (isToday(d)) key = 'Today'
      else if (isYesterday(d)) key = 'Yesterday'
      else if (isThisWeek(d, { weekStartsOn: 1 })) key = format(d, 'EEEE, d MMM')
      else key = format(d, 'd MMM yyyy')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    } catch { /* skip */ }
  })
  return [...groups.entries()]
}

export function groupByMonth(items, dateField) {
  const groups = new Map()
  items.forEach(item => {
    const raw = item[dateField]
    if (!raw) return
    try {
      const d = typeof raw === 'string' ? parseISO(raw) : raw
      const key = format(d, 'MMMM yyyy')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    } catch { /* skip unparseable */ }
  })
  return [...groups.entries()]
}

export function formatCurrency(amount) {
  if (amount == null) return '₦0.00'
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, 'dd MMM yyyy, HH:mm')
  } catch {
    return dateStr
  }
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import CustomerActionMenu from '../components/CustomerActionMenu'
import { Package, ShoppingCart, CreditCard, TrendingUp, AlertTriangle, Clock, Bell, Users } from 'lucide-react'
import { dashboardApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm transition-shadow' : ''}`}
    >
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const METHOD_BADGE = {
  cash: 'bg-green-100 text-green-700',
  card: 'bg-blue-100 text-blue-700',
  mobile_money: 'bg-purple-100 text-purple-700',
}

const URGENCY_STYLE = {
  overdue: 'bg-red-100 text-red-700 border-red-200',
  due_soon: 'bg-amber-100 text-amber-700 border-amber-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [customerMenu, setCustomerMenu] = useState(null)
  const { data: summary = {}, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary().then(r => r.data),
  })

  const paymentAlerts = summary.payment_alerts || []
  const atRiskCustomers = summary.at_risk_customers || []
  const overdueAlerts = paymentAlerts.filter(a => a.urgency === 'overdue')
  const dueSoonAlerts = paymentAlerts.filter(a => a.urgency === 'due_soon')

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Products in Stock"
          value={summary.total_products ?? '—'}
          sub={summary.low_stock_count ? `${summary.low_stock_count} low stock` : 'All stocked'}
          color="bg-blue-500"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          icon={ShoppingCart}
          label="Today's Sales"
          value={summary.today_sales ?? '—'}
          sub={formatCurrency(summary.today_revenue ?? 0)}
          color="bg-green-600"
          onClick={() => navigate('/sales/history')}
        />
        <StatCard
          icon={CreditCard}
          label="Total Receivables"
          value={formatCurrency(summary.total_receivables ?? 0)}
          sub={`${summary.overdue_count ?? 0} overdue`}
          color="bg-red-500"
          onClick={() => navigate('/receivables')}
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue Today"
          value={formatCurrency(summary.today_revenue ?? 0)}
          sub="cash + card + mobile"
          color="bg-purple-500"
          onClick={() => navigate('/sales/history')}
        />
      </div>

      {/* Payment Alerts banner */}
      {paymentAlerts.length > 0 && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => navigate('/reminders')}
        >
          <Bell size={20} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {overdueAlerts.length > 0 && `${overdueAlerts.length} overdue payment${overdueAlerts.length > 1 ? 's' : ''}`}
              {overdueAlerts.length > 0 && dueSoonAlerts.length > 0 && ' · '}
              {dueSoonAlerts.length > 0 && `${dueSoonAlerts.length} due soon`}
            </p>
            <p className="text-xs text-red-600 mt-0.5">Tap to send reminders to customers</p>
          </div>
          <span className="text-xs text-red-500 font-medium">View →</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Recent Sales</h2>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {(summary.recent_sales || []).length === 0 && (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No sales yet today</p>
            )}
            {(summary.recent_sales || []).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  {sale.customer_id ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCustomerMenu({ id: sale.customer_id, name: sale.customer_name, rect: e.currentTarget.getBoundingClientRect() }) }}
                      className="text-sm font-medium text-green-700 hover:underline text-left"
                    >
                      {sale.customer_name || 'Walk-in'}
                    </button>
                  ) : (
                    <p className="text-sm font-medium text-slate-700">{sale.customer_name || 'Walk-in'}</p>
                  )}
                  <p className="text-xs text-slate-400">{formatDate(sale.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${METHOD_BADGE[sale.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                    {sale.payment_method?.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-risk customers */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Customers Due for a Purchase</h2>
            <Users size={16} className="text-amber-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {atRiskCustomers.length === 0 && (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">All customers are purchasing regularly</p>
            )}
            {atRiskCustomers.map((c) => {
              const daysSince = c.days_since_last_purchase
              return (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCustomerMenu({ id: c.id, name: c.name, rect: e.currentTarget.getBoundingClientRect() }) }}
                      className="text-sm font-medium text-green-700 hover:underline text-left"
                    >
                      {c.name}
                    </button>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Last purchase: {c.last_purchase_date ? formatDate(c.last_purchase_date) : 'Never'}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    daysSince > 60 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {daysSince}d ago
                  </span>
                </div>
              )
            })}
          </div>
          {atRiskCustomers.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100">
              <button onClick={() => navigate('/customers')}
                className="text-xs text-green-700 font-medium hover:text-green-900">
                View all customers →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {(summary.low_stock_products || []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Low Stock Alerts</h2>
            <AlertTriangle size={16} className="text-orange-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {summary.low_stock_products.map((product) => (
              <div key={product.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-slate-700">{product.name}</p>
                  <span className="text-xs text-orange-600 font-semibold">{product.stock_qty} {product.unit}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min((product.stock_qty / product.reorder_level) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Reorder at {product.reorder_level} {product.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {customerMenu && (
        <CustomerActionMenu
          customer={{ id: customerMenu.id, name: customerMenu.name }}
          anchorRect={customerMenu.rect}
          onClose={() => setCustomerMenu(null)}
        />
      )}
    </div>
  )
}

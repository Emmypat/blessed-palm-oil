import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ShoppingCart, WifiOff, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi, inventoryApi, customersApi } from '../services/api'
import { formatCurrency } from '../utils/format'
import { queueSale } from '../utils/offlineQueue'
import { useSync } from '../context/SyncContext'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

export default function NewSale() {
  const navigate = useNavigate()
  const [isCredit, setIsCredit] = useState(false)
  const { refreshCount } = useSync()
  const qtyRefs = useRef({})

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then(r => r.data),
  })

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      payment_method: 'cash',
      payment_reference: '',
      is_credit: false,
      items: [{ product_id: '', qty: 1, unit_price: 0 }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')
  const watchPaymentMethod = watch('payment_method')

  const subtotals = watchItems.map(item => (parseFloat(item.unit_price) || 0) * (parseInt(item.qty) || 0))
  const total = subtotals.reduce((a, b) => a + b, 0)

  const handleProductChange = (index, productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    if (product) {
      setValue(`items.${index}.unit_price`, product.price)
      // Auto-advance to qty field
      setTimeout(() => qtyRefs.current[index]?.focus(), 60)
    }
  }

  const handleCustomerSelect = (e) => {
    const id = e.target.value
    if (!id) return
    const customer = customers.find(c => c.id === parseInt(id))
    if (customer) {
      setValue('customer_name', customer.name)
      if (customer.phone) setValue('customer_phone', customer.phone)
      if (customer.email) setValue('customer_email', customer.email)
    }
  }

  const saleMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      toast.success('Sale recorded successfully!')
      navigate('/sales/history')
    },
    onError: (e) => {
      if (e.message?.toLowerCase().includes('network')) {
        toast('Sale may have been saved — check Sales History before retrying.', { icon: '⚠️', duration: 6000 })
        navigate('/sales/history')
      } else {
        toast.error(e.message)
      }
    },
  })

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      customer_id: data.customer_id ? parseInt(data.customer_id) : null,
      customer_phone: data.customer_phone || null,
      customer_email: data.customer_email || null,
      payment_reference: data.payment_reference || null,
      is_credit: isCredit,
      due_date: isCredit ? (data.due_date || null) : null,
      items: data.items.map(item => ({
        product_id: parseInt(item.product_id),
        qty: parseInt(item.qty),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.unit_price) * parseInt(item.qty),
      })),
      total,
    }

    if (!navigator.onLine) {
      await queueSale(payload)
      await refreshCount()
      toast('Sale saved offline — will sync when connected', {
        icon: '📴',
        duration: 4000,
        style: { background: '#1e293b', color: '#fff' },
      })
      navigate('/sales/history')
      return
    }

    saleMutation.mutate(payload)
  }

  const submitBtn = (
    <button
      type="submit"
      disabled={saleMutation.isPending}
      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-60 active:scale-[0.98] transition-transform"
    >
      {saleMutation.isPending ? 'Processing...'
        : !navigator.onLine ? <><WifiOff size={18} /> Save Offline</>
        : <><ShoppingCart size={20} /> Complete Sale</>}
    </button>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-4 pb-32 lg:pb-4">

      {/* Customer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Existing Customer</label>
            <select {...register('customer_id')} onChange={handleCustomerSelect} className={inputCls}>
              <option value="">Walk-in / New Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input {...register('customer_name')} placeholder="Customer full name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone (Nigerian)</label>
            <input
              {...register('customer_phone', {
                pattern: { value: /^0[7-9][0-1]\d{8}$/, message: 'Enter a valid Nigerian number e.g. 08012345678' },
              })}
              placeholder="080XXXXXXXX"
              inputMode="tel"
              maxLength={11}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email (for receipt)</label>
            <input type="email" {...register('customer_email')} placeholder="customer@email.com" className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-slate-400">New customers are automatically saved to your customer list.</p>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Items</h2>
          {products.length > 0 && (
            <button type="button" onClick={() => append({ product_id: '', qty: 1, unit_price: 0 })}
              className="flex items-center gap-1.5 text-sm text-green-600 font-medium py-2 px-3 rounded-lg active:bg-green-50">
              <Plus size={15} /> Add Item
            </button>
          )}
        </div>

        {!productsLoading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package size={36} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No products yet</p>
            <p className="text-xs text-slate-400 mb-4">Add products to your inventory before recording a sale</p>
            <Link to="/inventory"
              className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-green-700">
              <Plus size={15} /> Go to Inventory
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-slate-100 rounded-xl p-3 space-y-3 bg-slate-50">
              <div className="flex gap-2 items-center">
                <select
                  {...register(`items.${index}.product_id`, { required: true })}
                  onChange={e => handleProductChange(index, e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_qty})</option>
                  ))}
                </select>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)}
                    className="p-3 text-red-400 hover:text-red-600 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    {...register(`items.${index}.qty`, { required: true, min: 1 })}
                    ref={el => {
                      register(`items.${index}.qty`).ref(el)
                      qtyRefs.current[index] = el
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...register(`items.${index}.unit_price`, { required: true })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Subtotal</label>
                  <div className="py-3 text-sm font-bold text-green-700">{formatCurrency(subtotals[index] || 0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Payment</h2>
        <div>
          <label className={labelCls}>Method</label>
          <div className="grid grid-cols-3 gap-2">
            {['cash', 'card', 'mobile_money'].map(method => (
              <label key={method}
                className={`flex items-center justify-center gap-1.5 cursor-pointer py-3 rounded-xl border text-sm font-medium transition-colors ${
                  watchPaymentMethod === method
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}>
                <input type="radio" value={method} {...register('payment_method')} className="hidden" />
                {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Transfer'}
              </label>
            ))}
          </div>
        </div>
        {watchPaymentMethod !== 'cash' && (
          <div>
            <label className={labelCls}>Reference / Transaction ID</label>
            <input {...register('payment_reference')} placeholder="e.g. transfer ref" className={inputCls} />
          </div>
        )}
        <div className="flex items-center gap-3 py-1">
          <button type="button" onClick={() => setIsCredit(!isCredit)}
            className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${isCredit ? 'bg-green-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${isCredit ? 'left-6' : 'left-1'}`} />
          </button>
          <span className="text-sm text-slate-700 cursor-pointer select-none flex-1" onClick={() => setIsCredit(!isCredit)}>
            Credit Sale <span className="text-slate-400 font-normal">(customer owes payment)</span>
          </span>
        </div>
        {isCredit && (
          <div>
            <label className={labelCls}>Repayment Due Date</label>
            <input
              type="date"
              {...register('due_date')}
              min={new Date().toISOString().split('T')[0]}
              defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Desktop submit */}
      <div className="hidden lg:block">{submitBtn}</div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-16 inset-x-0 z-20 lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(total)}</span>
        </div>
        {submitBtn}
      </div>

    </form>
  )
}

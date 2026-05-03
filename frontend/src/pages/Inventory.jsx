import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ArrowUpDown, Search, Package, Clock, CheckCircle, XCircle, Trash2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import SwipeableCard from '../components/SwipeableCard'
import toast from 'react-hot-toast'
import { inventoryApi, deletionsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'

const MOCK_PRODUCTS = []

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function ProductForm({ product, onClose, onSave }) {
  const [step, setStep] = useState(1)
  const { register, handleSubmit, trigger, formState: { errors } } = useForm({
    defaultValues: product || { unit: 'litres', stock_qty: 0 }
  })
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const goNext = async () => {
    const valid = await trigger(['name', 'type'])
    if (valid) setStep(2)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 rounded-full transition-all ${step === 1 ? 'w-6 bg-green-600' : 'w-2 bg-green-300'}`} />
        <div className={`h-2 rounded-full transition-all ${step === 2 ? 'w-6 bg-green-600' : 'w-2 bg-slate-200'}`} />
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
              <input autoFocus {...register('name', { required: 'Required' })} className={inputCls} placeholder="e.g. Crude Palm Oil" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select {...register('type', { required: 'Required' })} className={inputCls}>
                <option value="">Select type</option>
                <option>Crude Palm Oil</option>
                <option>Refined Palm Oil</option>
                <option>Palm Kernel Oil</option>
                <option>Palm Kernel</option>
                <option>Other</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
              <select {...register('unit')} className={inputCls}>
                <option value="litres">Litres</option>
                <option value="gallons">Gallons</option>
                <option value="drums">Drums</option>
                <option value="kegs">Kegs</option>
                <option value="tonnes">Tonnes</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3.5 text-sm active:bg-slate-50">Cancel</button>
              <button type="button" onClick={goNext}
                className="flex-1 bg-green-600 text-white rounded-xl py-3.5 text-sm font-medium active:bg-green-700 flex items-center justify-center gap-1.5">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price per unit (₦)</label>
              <input type="number" step="0.01" inputMode="decimal" autoFocus
                {...register('price', { required: 'Required', min: 0 })} className={inputCls} placeholder="0.00" />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
              <input type="number" inputMode="numeric"
                {...register('reorder_level', { required: 'Required', min: 0 })} className={inputCls} placeholder="Alert when stock falls below this" />
              {errors.reorder_level && <p className="text-red-500 text-xs mt-1">{errors.reorder_level.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {product ? 'Current Stock (direct correction)' : 'Opening Stock'}
              </label>
              <input type="number" inputMode="numeric"
                {...register('stock_qty', { required: 'Required', min: 0 })} className={inputCls} placeholder="Quantity on hand" />
              {errors.stock_qty && <p className="text-red-500 text-xs mt-1">{errors.stock_qty.message}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3.5 text-sm active:bg-slate-50 flex items-center justify-center gap-1.5">
                <ChevronLeft size={16} /> Back
              </button>
              <button type="submit"
                className="flex-1 bg-green-600 text-white rounded-xl py-3.5 text-sm font-medium active:bg-green-700">
                {product ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

function AdjustModal({ product, defaultReason = 'restock', onClose, onAdjust }) {
  const { register, handleSubmit } = useForm({ defaultValues: { reason: defaultReason } })
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  return (
    <form onSubmit={handleSubmit(onAdjust)} className="space-y-4">
      <p className="text-sm text-slate-600">
        Current stock: <strong className={product.stock_qty === 0 ? 'text-red-600' : ''}>{product.stock_qty} {product.unit}</strong>
      </p>
      {product.stock_qty === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 font-medium">
          This product is out of stock — requires a second user to approve.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type</label>
        <select {...register('reason')} className={inputCls}>
          <option value="restock">Restock (Add)</option>
          <option value="correction">Stock Correction (Set exact qty)</option>
          <option value="damaged">Damaged / Loss (Subtract)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
        <input type="number" min="1" inputMode="numeric" autoFocus
          {...register('quantity', { required: true, min: 1 })} className={inputCls} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-3.5 text-sm active:bg-slate-50">Cancel</button>
        <button type="submit"
          className="flex-1 bg-green-600 text-white rounded-xl py-3.5 text-sm font-medium active:bg-green-700">Submit for Approval</button>
      </div>
    </form>
  )
}

const REASON_LABEL = { restock: 'Restock (+)', damaged: 'Damaged (−)', correction: 'Correction (=)' }

export default function Inventory() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [adjustDefaultReason, setAdjustDefaultReason] = useState('restock')

  const openAdjust = (product, reason = 'restock') => {
    setAdjustDefaultReason(reason)
    setAdjustProduct(product)
  }

  const { data: products = MOCK_PRODUCTS } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
    placeholderData: MOCK_PRODUCTS,
  })

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => { qc.invalidateQueries(['inventory']); setShowAdd(false); toast.success('Product added') },
    onError: (e) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.requestEdit(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['pendingChanges'])
      setEditProduct(null)
      toast.success('Edit submitted — awaiting approval from another user')
    },
    onError: (e) => toast.error(e.message),
  })
  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.adjustStock(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['inventory'])
      qc.invalidateQueries(['pendingChanges'])
      setAdjustProduct(null)
      toast.success('Adjustment submitted — awaiting approval from another user')
    },
    onError: (e) => toast.error(e.message),
  })

  const { data: pendingChanges = [] } = useQuery({
    queryKey: ['pendingChanges'],
    queryFn: () => inventoryApi.getPendingChanges().then(r => r.data),
  })

  const { data: pendingDeletions = [] } = useQuery({
    queryKey: ['pendingDeletions', 'product'],
    queryFn: () => deletionsApi.getPending('product').then(r => r.data),
  })

  const requestDeleteMutation = useMutation({
    mutationFn: ({ id, label }) => deletionsApi.request('product', id, label),
    onSuccess: () => { qc.invalidateQueries(['pendingDeletions', 'product']); toast.success('Delete request submitted — awaiting approval from another user') },
    onError: (e) => toast.error(e.message),
  })

  const approveDeleteMutation = useMutation({
    mutationFn: deletionsApi.approve,
    onSuccess: () => { qc.invalidateQueries(['inventory']); qc.invalidateQueries(['pendingDeletions', 'product']); toast.success('Product deleted') },
    onError: (e) => toast.error(e.message),
  })

  const rejectDeleteMutation = useMutation({
    mutationFn: deletionsApi.reject,
    onSuccess: () => { qc.invalidateQueries(['pendingDeletions', 'product']); toast.success('Deletion cancelled') },
    onError: (e) => toast.error(e.message),
  })

  const approveMutation = useMutation({
    mutationFn: inventoryApi.approveChange,
    onSuccess: () => { qc.invalidateQueries(['inventory']); qc.invalidateQueries(['pendingChanges']); toast.success('Adjustment approved') },
    onError: (e) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: inventoryApi.rejectChange,
    onSuccess: () => { qc.invalidateQueries(['pendingChanges']); toast.success('Adjustment rejected') },
    onError: (e) => toast.error(e.message),
  })

  const depleted = products.filter(p => p.stock_qty === 0)
  const pendingRestockIds = new Set(
    pendingChanges.filter(c => c.reason === 'restock').map(c => c.product_id)
  )
  const pendingEditIds = new Set(
    pendingChanges.filter(c => c.change_type === 'edit_product').map(c => c.product_id)
  )

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingDeleteIds = new Set(pendingDeletions.map(d => d.entity_id))

  const stockBadge = (p) => {
    if (p.stock_qty === 0) return { label: 'Depleted', cls: 'bg-red-100 text-red-700 font-bold' }
    if (p.stock_qty <= p.reorder_level) return { label: 'Low Stock', cls: 'bg-orange-100 text-orange-600' }
    return { label: 'In Stock', cls: 'bg-green-100 text-green-600' }
  }

  return (
    <div className="space-y-4">

      {/* Depleted products panel */}
      {depleted.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">Out of Stock ({depleted.length})</h3>
          </div>
          {depleted.map(p => {
            const hasPendingRestock = pendingRestockIds.has(p.id)
            return (
              <div key={p.id} className="bg-white rounded-lg border border-red-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.type} · {p.unit}</p>
                </div>
                {hasPendingRestock ? (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-lg shrink-0">Restock pending</span>
                ) : (
                  <button
                    onClick={() => openAdjust(p, 'restock')}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg shrink-0 active:scale-95">
                    <Plus size={13} /> Restock
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending deletions */}
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

      {/* Pending approvals */}
      {pendingChanges.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Pending Approvals ({pendingChanges.length})</h3>
          </div>
          {pendingChanges.map(change => (
            <div key={change.id} className="bg-white rounded-lg border border-amber-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{change.product_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{change.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Requested by <strong>{change.requested_by}</strong></p>
                </div>
                {change.requested_by !== user?.username ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveMutation.mutate(change.id)} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => rejectMutation.mutate(change.id)} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-lg shrink-0">Awaiting 2nd user</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 whitespace-nowrap">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        )}
        {filtered.map(product => {
          const badge = stockBadge(product)
          const isPendingDelete = pendingDeleteIds.has(product.id)
          const isPendingEdit = pendingEditIds.has(product.id)
          const swipeActions = [
            { label: 'Restock', icon: <Plus size={18} />, bg: 'bg-green-600', onClick: () => openAdjust(product, 'restock') },
            { label: 'Adjust', icon: <ArrowUpDown size={18} />, bg: 'bg-blue-500', onClick: () => openAdjust(product) },
            isPendingEdit
              ? { label: 'Edit…', icon: <Pencil size={18} />, bg: 'bg-amber-400', onClick: () => {} }
              : { label: 'Edit', icon: <Pencil size={18} />, bg: 'bg-slate-500', onClick: () => setEditProduct(product) },
            isPendingDelete
              ? { label: 'Pending', icon: <AlertTriangle size={18} />, bg: 'bg-red-300', onClick: () => {} }
              : { label: 'Delete', icon: <Trash2 size={18} />, bg: 'bg-red-500', onClick: () => requestDeleteMutation.mutate({ id: product.id, label: `${product.name} (${product.type})` }) },
          ]
          return (
            <SwipeableCard key={product.id} actions={swipeActions}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{product.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    {isPendingEdit && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Edit pending</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">Price: <strong className="text-slate-700">{formatCurrency(product.price)}</strong></span>
                  <span className="text-slate-500">Stock: <strong className={product.stock_qty === 0 ? 'text-red-600' : product.stock_qty <= product.reorder_level ? 'text-orange-600' : 'text-slate-700'}>{product.stock_qty} {product.unit}</strong></span>
                </div>
              </div>
            </SwipeableCard>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />No products found
                </td></tr>
              )}
              {filtered.map(product => {
                const badge = stockBadge(product)
                const isPendingEdit = pendingEditIds.has(product.id)
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 ${product.stock_qty === 0 ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {product.name}
                      {isPendingEdit && <span className="ml-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">edit pending</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{product.type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(product.price)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${product.stock_qty === 0 ? 'text-red-600' : product.stock_qty <= product.reorder_level ? 'text-orange-600' : 'text-slate-700'}`}>
                      {product.stock_qty} {product.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.stock_qty === 0 && (
                          <button onClick={() => openAdjust(product, 'restock')}
                            className="text-xs flex items-center gap-1 text-white bg-green-600 hover:bg-green-700 rounded px-2 py-1">
                            <Plus size={12} /> Restock
                          </button>
                        )}
                        <button onClick={() => openAdjust(product)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1">
                          <ArrowUpDown size={12} /> Adjust
                        </button>
                        {isPendingEdit ? (
                          <span className="text-xs flex items-center gap-1 text-amber-600 border border-amber-200 bg-amber-50 rounded px-2 py-1">
                            <Pencil size={12} /> Edit pending
                          </span>
                        ) : (
                          <button onClick={() => setEditProduct(product)}
                            className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-800 border border-slate-200 rounded px-2 py-1">
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                        {pendingDeleteIds.has(product.id) ? (
                          <span className="text-xs flex items-center gap-1 text-red-400 border border-red-200 bg-red-50 rounded px-2 py-1">
                            <Trash2 size={12} /> Pending
                          </span>
                        ) : (
                          <button onClick={() => requestDeleteMutation.mutate({ id: product.id, label: `${product.name} (${product.type})` })}
                            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)}>
          <ProductForm onClose={() => setShowAdd(false)} onSave={data => createMutation.mutate(data)} />
        </Modal>
      )}
      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)}>
          <ProductForm product={editProduct} onClose={() => setEditProduct(null)}
            onSave={data => updateMutation.mutate({ id: editProduct.id, data })} />
        </Modal>
      )}
      {adjustProduct && (
        <Modal title={`${adjustDefaultReason === 'restock' ? 'Restock' : 'Adjust Stock'} – ${adjustProduct.name}`} onClose={() => setAdjustProduct(null)}>
          <AdjustModal product={adjustProduct} defaultReason={adjustDefaultReason} onClose={() => setAdjustProduct(null)}
            onAdjust={data => adjustMutation.mutate({ id: adjustProduct.id, data })} />
        </Modal>
      )}
    </div>
  )
}

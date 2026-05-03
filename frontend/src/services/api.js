import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ct_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ct_token')
      localStorage.removeItem('ct_user')
      window.location.href = '/login'
      return Promise.reject(new Error('Session expired'))
    }
    const detail = err.response?.data?.detail
    let message
    if (Array.isArray(detail)) {
      message = detail.map(d => d.msg || JSON.stringify(d)).join(', ')
    } else {
      message = detail || err.message || 'An error occurred'
    }
    return Promise.reject(new Error(message))
  }
)

// Inventory
export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  getOne: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  requestEdit: (id, data) => api.post(`/inventory/${id}/request-edit`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust`, data),
  getPendingChanges: () => api.get('/inventory/changes/pending'),
  approveChange: (id) => api.post(`/inventory/changes/${id}/approve`),
  rejectChange: (id) => api.post(`/inventory/changes/${id}/reject`),
}

// Customers
export const customersApi = {
  getAll: () => api.get('/customers'),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
}

// Sales
export const salesApi = {
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  verify: (id) => api.post(`/sales/${id}/verify`),
  decline: (id) => api.post(`/sales/${id}/decline`),
}

// Receivables
export const receivablesApi = {
  getAll: (params) => api.get('/receivables', { params }),
  getOne: (id) => api.get(`/receivables/${id}`),
  requestPayment: (id, data) => api.post(`/receivables/${id}/request-payment`, data),
  getPendingPayments: () => api.get('/receivables/pending-payments'),
  approvePayment: (id) => api.post(`/receivables/pending-payments/${id}/approve`),
  rejectPayment: (id) => api.post(`/receivables/pending-payments/${id}/reject`),
}

// Receipts
export const receiptsApi = {
  getAll: (params) => api.get('/receipts', { params }),
  getOne: (id) => api.get(`/receipts/${id}`),
  resend: (id) => api.post(`/receipts/${id}/resend`),
  download: (id) => api.get(`/receipts/${id}/download`, { responseType: 'blob' }),
}

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
}

// Analytics — purchasing cycle
export const analyticsApi = {
  getCustomerStats: (id) => api.get(`/analytics/customers/${id}`),
  getAtRisk: () => api.get('/analytics/at-risk'),
}

// Payment reminders
export const remindersApi = {
  getAll: () => api.get('/reminders/all'),
  getDue: () => api.get('/reminders/due'),
  send: (id) => api.post(`/reminders/${id}/send`),
}

// Two-user deletion approvals
export const deletionsApi = {
  request: (entityType, entityId, entityLabel) =>
    api.post('/deletions/request', { entity_type: entityType, entity_id: entityId, entity_label: entityLabel }),
  getPending: (entityType) =>
    api.get('/deletions/pending', { params: entityType ? { entity_type: entityType } : {} }),
  approve: (id) => api.post(`/deletions/${id}/approve`),
  reject: (id) => api.post(`/deletions/${id}/reject`),
}

export default api

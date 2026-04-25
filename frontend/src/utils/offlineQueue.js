import { openDB } from 'idb'

const DB_NAME = 'cementtrack'
const STORE = 'pending-sales'
const VERSION = 1

function getDB() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function queueSale(saleData) {
  const db = await getDB()
  const entry = {
    id: crypto.randomUUID(),
    data: saleData,
    created_at: new Date().toISOString(),
    status: 'pending',
    error: null,
  }
  await db.add(STORE, entry)
  return entry.id
}

export async function getPendingSales() {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function removePendingSale(id) {
  const db = await getDB()
  return db.delete(STORE, id)
}

export async function markSaleFailed(id, error) {
  const db = await getDB()
  const entry = await db.get(STORE, id)
  if (entry) {
    await db.put(STORE, { ...entry, status: 'failed', error })
  }
}

export async function clearFailedSales() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  await Promise.all(
    all.filter(e => e.status === 'failed').map(e => db.delete(STORE, e.id))
  )
}

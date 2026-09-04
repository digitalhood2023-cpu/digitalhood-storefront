export type OfflineActionType =
  | 'notification_read'
  | 'notification_archive'
  | 'notification_mark_all_read'

export type OfflineAction = {
  id: string
  type: OfflineActionType
  entityId?: string
  createdAt: string
  attempts: number
}

const DATABASE_NAME = 'digitalhood-network-v1'
const STORE_NAME = 'safe-actions'
const DATA_SAVER_KEY = 'digitalhood_data_saver'
const ALLOWED_ACTIONS = new Set<OfflineActionType>([
  'notification_read',
  'notification_archive',
  'notification_mark_all_read',
])

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getConnection() {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function isLowDataConnection() {
  const connection = getConnection()
  const manual = localStorage.getItem(DATA_SAVER_KEY)
  return (
    manual === 'on' ||
    connection?.saveData === true ||
    ['slow-2g', '2g', '3g'].includes(String(connection?.effectiveType || '').toLowerCase())
  )
}

export function setDataSaverPreference(enabled: boolean) {
  localStorage.setItem(DATA_SAVER_KEY, enabled ? 'on' : 'off')
  applyNetworkPreferences()
  window.dispatchEvent(new CustomEvent('digitalhood:data-saver-change', { detail: { enabled } }))
}

export function applyNetworkPreferences() {
  const enabled = isLowDataConnection()
  document.documentElement.dataset.dataSaver = enabled ? 'on' : 'off'
  if (enabled) {
    document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      video.preload = 'none'
      video.autoplay = false
      video.pause()
    })
    document.querySelectorAll<HTMLImageElement>('img:not([fetchpriority="high"])').forEach((image) => {
      image.loading = 'lazy'
      image.decoding = 'async'
    })
  }
}

export function registerDigitalHoodServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
  })
}

export async function queueOfflineAction(input: Omit<OfflineAction, 'id' | 'createdAt' | 'attempts'>) {
  if (!ALLOWED_ACTIONS.has(input.type)) throw new Error('This action cannot be queued offline.')
  const entityId = String(input.entityId || '').trim()
  if (input.type !== 'notification_mark_all_read' && !/^[a-zA-Z0-9-]{1,160}$/.test(entityId)) {
    throw new Error('A valid notification id is required.')
  }
  const action: OfflineAction = {
    id:
      input.type === 'notification_mark_all_read'
        ? input.type
        : `${input.type}:${entityId}`,
    type: input.type,
    ...(entityId ? { entityId } : {}),
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    await requestResult(transaction.objectStore(STORE_NAME).put(action))
  } finally {
    database.close()
  }
  return action
}

export async function listOfflineActions() {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const actions = await requestResult(transaction.objectStore(STORE_NAME).getAll())
    return (actions as OfflineAction[])
      .filter((action) => ALLOWED_ACTIONS.has(action.type))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 100)
  } finally {
    database.close()
  }
}

export async function removeOfflineAction(id: string) {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    await requestResult(transaction.objectStore(STORE_NAME).delete(id))
  } finally {
    database.close()
  }
}

export async function flushOfflineActions(executor: (action: OfflineAction) => Promise<void>) {
  if (!navigator.onLine) return { completed: 0, remaining: (await listOfflineActions()).length }
  const actions = await listOfflineActions()
  let completed = 0
  for (const action of actions) {
    try {
      await executor(action)
      await removeOfflineAction(action.id)
      completed += 1
    } catch {
      break
    }
  }
  return { completed, remaining: actions.length - completed }
}

export async function clearOfflineAccountQueue() {
  if (!('indexedDB' in window)) return
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

export const NETWORK_CACHE_POLICY = Object.freeze({
  publicCatalogue: 'stale-while-revalidate',
  applicationShell: 'cache-first-versioned',
  accountData: 'network-only',
  messages: 'network-only-with-local-status',
  payments: 'network-only-server-authoritative',
  identity: 'network-only-server-authoritative',
  deliveryConfirmation: 'network-only-server-authoritative',
})

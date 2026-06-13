export type OrderStoreMetaEntry = {
  key?: string
  value?: unknown
  displayKey?: string
  displayValue?: string
}

export type OrderStoreItem = {
  id: number | string
  name?: string
  quantity?: number
  subtotal?: string | number
  total?: string | number
  image?: string
  meta?: OrderStoreMetaEntry[]
  seller?: unknown
  sellerStoreName?: string
  seller_store_name?: string
  sellerKey?: string
  seller_key?: string
  sellerUrl?: string
  seller_url?: string
  sellerAvatarUrl?: string
  seller_avatar_url?: string
  sellerProfilePhotoUrl?: string
  seller_profile_photo_url?: string
  sellerVerified?: boolean
  seller_verified?: boolean
  sellerFeedbackText?: string
  seller_feedback_text?: string
}

export type OrderStoreGroup<T extends OrderStoreItem> = {
  key: string
  storeName: string
  sellerUrl: string
  avatarUrl: string
  initials: string
  feedbackText: string
  verified: boolean
  subtotal: number
  items: T[]
}

function normalizeMetaKey(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/^_+/, '')
    .replace(/[^a-z0-9]+/g, '')
}

function getMetaValue(item: OrderStoreItem, aliases: string[]) {
  const wanted = aliases.map(normalizeMetaKey)
  const meta = item.meta || []

  for (const entry of meta) {
    const key = normalizeMetaKey(entry.displayKey || entry.key)

    if (!key || !wanted.includes(key)) continue

    const rawValue =
      entry.displayValue !== undefined && entry.displayValue !== null
        ? entry.displayValue
        : entry.value

    const value = String(rawValue || '').trim()

    if (value) return value
  }

  return ''
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'DH'
  )
}

export function getOrderItemStoreInfo(item: OrderStoreItem) {
  const directStoreName =
    item.sellerStoreName ||
    item.seller_store_name ||
    (item.seller && typeof item.seller === 'object'
      ? String((item.seller as { storeName?: string }).storeName || '')
      : '')

  const storeName =
    directStoreName ||
    getMetaValue(item, [
      'sellerStoreName',
      'seller_store_name',
      'storeName',
      'store_name',
      'soldBy',
      'sold_by',
      'seller',
      'vendor',
    ]) ||
    'DigitalHood'

  const key =
    item.sellerKey ||
    item.seller_key ||
    getMetaValue(item, ['sellerKey', 'seller_key', 'storeKey', 'store_key']) ||
    slugify(storeName)

  const isDigitalHood = storeName.toLowerCase() === 'digitalhood'

  const avatarUrl =
    item.sellerAvatarUrl ||
    item.seller_avatar_url ||
    item.sellerProfilePhotoUrl ||
    item.seller_profile_photo_url ||
    getMetaValue(item, [
      'sellerAvatarUrl',
      'seller_avatar_url',
      'sellerProfilePhotoUrl',
      'seller_profile_photo_url',
      'storeAvatarUrl',
      'store_avatar_url',
    ]) ||
    (isDigitalHood ? '/logo.jpg' : '')

  const sellerUrl =
    item.sellerUrl ||
    item.seller_url ||
    getMetaValue(item, ['sellerUrl', 'seller_url', 'storeUrl', 'store_url']) ||
    `/seller/${key || 'digitalhood'}`

  const feedbackText =
    item.sellerFeedbackText ||
    item.seller_feedback_text ||
    getMetaValue(item, [
      'sellerFeedbackText',
      'seller_feedback_text',
      'storeFeedback',
      'store_feedback',
    ]) ||
    (isDigitalHood ? 'Official DigitalHood store' : 'Marketplace seller')

  return {
    key: key || 'digitalhood',
    storeName,
    sellerUrl,
    avatarUrl,
    initials: getInitials(storeName),
    feedbackText,
    verified: Boolean(item.sellerVerified || item.seller_verified || isDigitalHood),
  }
}

export function groupOrderItemsByStore<T extends OrderStoreItem>(items: T[] = []) {
  const groups = new Map<string, OrderStoreGroup<T>>()

  for (const item of items) {
    const store = getOrderItemStoreInfo(item)
    const key = store.key || store.storeName
    const itemTotal = Number(item.total || item.subtotal || 0)

    if (!groups.has(key)) {
      groups.set(key, {
        ...store,
        subtotal: 0,
        items: [],
      })
    }

    const group = groups.get(key)!

    group.items.push(item)
    group.subtotal += Number.isFinite(itemTotal) ? itemTotal : 0
  }

  return Array.from(groups.values())
}

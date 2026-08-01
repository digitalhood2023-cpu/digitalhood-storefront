import { SITE, type JsonLdObject } from '@/lib/site'
import type { PublicSellerStore } from '@/api/publicSellers'
import type { WooProduct } from '@/lib/woocommerce'

export const ORGANIZATION_ID = `${SITE.url}/#organization`
export const WEBSITE_ID = `${SITE.url}/#website`

const text = (value: unknown) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const number = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function absoluteUrl(value?: string | null, fallback = SITE.url) {
  try {
    return new URL(value || fallback, SITE.url).toString()
  } catch {
    return fallback
  }
}

export function buildOnlineStoreSchema(): JsonLdObject {
  return {
    '@type': 'OnlineStore',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: `${SITE.url}/`,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.jpg') },
    image: absoluteUrl(SITE.socialImage),
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lusaka',
      addressRegion: 'Lusaka',
      addressCountry: SITE.country,
    },
    areaServed: { '@type': 'Country', name: 'Zambia' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: SITE.phone,
        email: SITE.email,
        areaServed: SITE.country,
        availableLanguage: ['English'],
        url: `${SITE.url}/support`,
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: SITE.phone,
        email: SITE.email,
        areaServed: SITE.country,
        availableLanguage: ['English'],
        url: `${SITE.url}/contact`,
      },
    ],
  }
}

export function buildWebsiteSchema(): JsonLdObject {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE.url}/`,
    name: 'DigitalHood Marketplace',
    alternateName: ['DigitalHood', 'DigitalHood Zambia'],
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { '@id': ORGANIZATION_ID },
  }
}

export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; path?: string }>,
  path = crumbs.at(-1)?.path || '/'
): JsonLdObject {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: text(crumb.name),
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  }
}

export function buildWebPageSchema(input: {
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage'
  name: string
  description: string
  path: string
}): JsonLdObject {
  const url = absoluteUrl(input.path)
  return {
    '@type': input.type || 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: text(input.name),
    description: text(input.description),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    inLanguage: SITE.language,
  }
}

function availability(product: WooProduct) {
  const status = String(product.stockStatus || product.stock_status || '').toLowerCase()
  if (status === 'outofstock' || product.canAddToCart === false) {
    return 'https://schema.org/OutOfStock'
  }
  if (status === 'onbackorder') return 'https://schema.org/BackOrder'
  if (status === 'preorder') return 'https://schema.org/PreOrder'
  return 'https://schema.org/InStock'
}

function condition(value: unknown) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z]/g, '')
  if (normalized.includes('refurb')) return 'https://schema.org/RefurbishedCondition'
  if (normalized.includes('used') || normalized.includes('preowned')) {
    return 'https://schema.org/UsedCondition'
  }
  if (normalized.includes('damaged')) return 'https://schema.org/DamagedCondition'
  if (normalized.includes('new')) return 'https://schema.org/NewCondition'
  return undefined
}

const first = (...values: unknown[]) =>
  values.find((value) => typeof value === 'string' && value.trim()) as string | undefined

export function buildProductSchema(
  product: WooProduct,
  raw: Record<string, any> | null = null
): JsonLdObject {
  const path = `/product/${encodeURIComponent(product.slug || String(product.id))}`
  const url = absoluteUrl(path)
  const images = Array.from(
    new Set([product.image, ...(product.images || [])].filter(Boolean).map((item) => absoluteUrl(item)))
  )
  const price = number(product.price)
  const ratingValue = number(product.averageRating)
  const ratingCount = number(product.ratingCount || product.reviewCount)
  const sku = first(raw?.sku, raw?.product_sku)
  const gtin = first(raw?.gtin, raw?.gtin13, raw?.ean, raw?.barcode)
  const mpn = first(raw?.mpn, raw?.manufacturer_part_number)
  const brand = first(raw?.brand?.name, raw?.brand, raw?.brands?.[0]?.name, raw?.manufacturer)
  const itemCondition = condition(raw?.condition || raw?.item_condition || raw?.product_condition)
  const sellerName = text(product.sellerStoreName || product.seller?.storeName || SITE.name)
  const sellerKey = text(product.sellerKey || product.seller?.key || 'digitalhood')
  const sellerUrl = absoluteUrl(`/seller/${encodeURIComponent(sellerKey)}`)

  const schema: JsonLdObject = {
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: text(product.name),
    description: text(product.shortDescription || product.description || product.name),
    image: images,
    productID: `woocommerce:${product.id}`,
    ...(product.categories?.length
      ? { category: product.categories.map((item) => item.name).join(' > ') }
      : {}),
    ...(sku ? { sku } : {}),
    ...(gtin ? { gtin } : {}),
    ...(mpn ? { mpn } : {}),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    ...(ratingValue && ratingCount && ratingValue > 0 && ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue,
            ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  if (price !== null && price >= 0) {
    schema.offers = {
      '@type': 'Offer',
      '@id': `${url}#offer`,
      url,
      price: price.toFixed(2),
      priceCurrency: SITE.currency,
      availability: availability(product),
      ...(itemCondition ? { itemCondition } : {}),
      seller: {
        '@type': 'Organization',
        '@id': `${sellerUrl}#seller`,
        name: sellerName || SITE.name,
        url: sellerUrl,
      },
    }
  }

  if (product.attributes?.length) {
    schema.additionalProperty = product.attributes
      .filter((attribute) => attribute.name && attribute.options?.length)
      .map((attribute) => ({
        '@type': 'PropertyValue',
        name: text(attribute.name),
        value: attribute.options.map(text).filter(Boolean).join(', '),
      }))
  }

  return schema
}

export function buildSellerProfileSchemas(store: PublicSellerStore): JsonLdObject[] {
  const seller = store.seller
  const path = `/seller/${encodeURIComponent(seller.key)}`
  const url = absoluteUrl(path)
  const id = `${url}#seller`
  const description = text(
    seller.tagline || seller.description || `Shop products from ${seller.storeName} on DigitalHood.`
  )

  const entity: JsonLdObject = {
    '@type': 'Organization',
    '@id': id,
    name: text(seller.storeName),
    url,
    description,
    ...(seller.profilePhotoUrl
      ? { image: absoluteUrl(seller.profilePhotoUrl), logo: absoluteUrl(seller.profilePhotoUrl) }
      : {}),
    ...(store.stats.ratingAverage && store.stats.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: store.stats.ratingAverage,
            ratingCount: store.stats.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  const profile: JsonLdObject = {
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    name: `${text(seller.storeName)} on DigitalHood`,
    description,
    mainEntity: { '@id': id },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: SITE.language,
  }

  const list: JsonLdObject | null = store.products.length
    ? {
        '@type': 'ItemList',
        '@id': `${url}#products`,
        name: `${text(seller.storeName)} products`,
        numberOfItems: store.products.length,
        itemListElement: store.products.slice(0, 50).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/product/${encodeURIComponent(product.slug || String(product.id))}`),
          name: text(product.name),
        })),
      }
    : null

  return [profile, entity, ...(list ? [list] : [])]
}

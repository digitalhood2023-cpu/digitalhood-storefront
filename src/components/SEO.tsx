import { useEffect, useRef } from 'react'
import { SITE, type JsonLdObject, type SeoConfig } from '@/lib/site'

type SEOProps = SeoConfig & { priority?: number }
type RegistryEntry = { config: SeoConfig; priority: number; order: number }

const registry = new Map<symbol, RegistryEntry>()
let registrationOrder = 0

function setMeta(
  selector: string,
  identity: Record<string, string>,
  value: string
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    Object.entries(identity).forEach(([key, identityValue]) => {
      element?.setAttribute(key, identityValue)
    })
    element.dataset.digitalhoodSeo = 'managed'
    document.head.appendChild(element)
  }

  element.setAttribute('content', value)
}

function setCanonical(value: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    element.dataset.digitalhoodSeo = 'managed'
    document.head.appendChild(element)
  }

  element.setAttribute('href', value)
}

function flattenStructuredData(value: SeoConfig['structuredData']): JsonLdObject[] {
  if (!value) return []

  const values = Array.isArray(value) ? value : [value]
  const flattened: JsonLdObject[] = []

  values.forEach((item) => {
    if (!item || typeof item !== 'object') return

    const graph = Array.isArray(item['@graph']) ? item['@graph'] : null
    if (graph) {
      graph.forEach((graphItem) => {
        if (graphItem && typeof graphItem === 'object') {
          flattened.push(graphItem as JsonLdObject)
        }
      })
      return
    }

    const { '@context': _context, ...schema } = item
    flattened.push(schema)
  })

  return flattened
}

function getActiveEntry() {
  return Array.from(registry.values()).sort((left, right) => {
    if (left.priority !== right.priority) return right.priority - left.priority
    return right.order - left.order
  })[0]
}

function collectStructuredData() {
  const seen = new Set<string>()
  const schemas: JsonLdObject[] = []

  Array.from(registry.values())
    .sort((left, right) => left.priority - right.priority || left.order - right.order)
    .forEach(({ config }) => {
      flattenStructuredData(config.structuredData).forEach((schema) => {
        const key =
          typeof schema['@id'] === 'string'
            ? `id:${schema['@id']}`
            : `json:${JSON.stringify(schema)}`

        if (seen.has(key)) return
        seen.add(key)
        schemas.push(schema)
      })
    })

  return schemas
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function updateJsonLd(schemas: JsonLdObject[], suppress: boolean) {
  const selector =
    'script[type="application/ld+json"][data-digitalhood-json-ld="page"]'
  let script = document.head.querySelector<HTMLScriptElement>(selector)

  if (suppress || schemas.length === 0) {
    script?.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.digitalhoodJsonLd = 'page'
    document.head.appendChild(script)
  }

  script.textContent = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': schemas,
  })
}

function applyHead() {
  const active = getActiveEntry()
  if (!active) return

  const { config } = active
  const requestedTitle = config.title?.trim()
  const finalTitle = requestedTitle
    ? requestedTitle.toLowerCase().includes(SITE.name.toLowerCase())
      ? requestedTitle
      : `${requestedTitle} | ${SITE.name}`
    : SITE.title
  const finalDescription = config.description || SITE.description
  const finalUrl = new URL(config.path || '/', SITE.url).toString()
  const finalImage = new URL(config.image || SITE.socialImage, SITE.url).toString()
  const robots = config.noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-image-preview:large'

  document.title = finalTitle
  setMeta('meta[name="description"]', { name: 'description' }, finalDescription)
  setMeta('meta[name="robots"]', { name: 'robots' }, robots)
  setMeta('meta[name="googlebot"]', { name: 'googlebot' }, robots)
  setCanonical(finalUrl)

  setMeta('meta[property="og:title"]', { property: 'og:title' }, finalTitle)
  setMeta(
    'meta[property="og:description"]',
    { property: 'og:description' },
    finalDescription
  )
  setMeta('meta[property="og:url"]', { property: 'og:url' }, finalUrl)
  setMeta('meta[property="og:image"]', { property: 'og:image' }, finalImage)
  setMeta(
    'meta[property="og:type"]',
    { property: 'og:type' },
    config.ogType || 'website'
  )
  setMeta('meta[property="og:locale"]', { property: 'og:locale' }, SITE.locale)
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE.name)

  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, finalTitle)
  setMeta(
    'meta[name="twitter:description"]',
    { name: 'twitter:description' },
    finalDescription
  )
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, finalImage)

  updateJsonLd(collectStructuredData(), Boolean(config.noindex))
}

export default function SEO({ priority = 10, ...config }: SEOProps) {
  const token = useRef(Symbol('digitalhood-seo'))

  useEffect(() => {
    const order = ++registrationOrder
    registry.set(token.current, { config, priority, order })
    applyHead()

    return () => {
      registry.delete(token.current)
      applyHead()
    }
  }, [
    config.title,
    config.description,
    config.path,
    config.image,
    config.noindex,
    config.ogType,
    config.structuredData,
    priority,
  ])

  return null
}

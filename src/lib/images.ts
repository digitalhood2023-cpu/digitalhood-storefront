type ImageSize = 'thumb' | 'card' | 'medium' | 'large' | 'full'

const SIZE_WIDTHS: Record<ImageSize, number> = {
  thumb: 160,
  card: 420,
  medium: 760,
  large: 1200,
  full: 0,
}

function isLocalAsset(url: string) {
  return url.startsWith('/') && !url.startsWith('//')
}

function isDataUrl(url: string) {
  return url.startsWith('data:')
}

const CLOUDFLARE_IMAGE_ZONE = 'https://digitalhood.info'
const CLOUDFLARE_IMAGE_QUALITY = 80

function isDigitalHoodHostname(hostname: string) {
  const normalized = hostname.toLowerCase()

  return (
    normalized === 'digitalhood.info' ||
    normalized.endsWith('.digitalhood.info')
  )
}

function isOptimizableWordPressImage(url: URL) {
  return (
    isDigitalHoodHostname(url.hostname) &&
    /\/wp-content\/uploads\//i.test(url.pathname) &&
    /\.(jpe?g|png|webp)$/i.test(url.pathname)
  )
}

function buildCloudflareImageUrl(source: URL, width: number) {
  const options = [
    `width=${width}`,
    'fit=scale-down',
    `quality=${CLOUDFLARE_IMAGE_QUALITY}`,
    'format=auto',
  ].join(',')

  return `${CLOUDFLARE_IMAGE_ZONE}/cdn-cgi/image/${options}/${source.toString()}`
}

export function getOptimizedImageUrl(
  input?: string | null,
  size: ImageSize = 'card'
) {
  const rawUrl = String(input || '').trim()

  if (!rawUrl) return '/logo.jpg'
  if (rawUrl === '/logo.jpg' || isLocalAsset(rawUrl) || isDataUrl(rawUrl)) return rawUrl
  if (size === 'full') return rawUrl

  const width = SIZE_WIDTHS[size] || SIZE_WIDTHS.card

  try {
    const url = new URL(rawUrl, window.location.origin)

    if (url.hostname.includes('images.unsplash.com')) {
      url.searchParams.set('w', String(width))
      url.searchParams.set('q', '75')
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fit', url.searchParams.get('fit') || 'crop')
      return url.toString()
    }

    if (isOptimizableWordPressImage(url)) {
      return buildCloudflareImageUrl(url, width)
    }

    return rawUrl
  } catch {
    return rawUrl
  }
}

export function getImageSrcSet(input?: string | null, size: ImageSize = 'card') {
  const rawUrl = String(input || '').trim()

  if (!rawUrl || rawUrl === '/logo.jpg' || isLocalAsset(rawUrl) || isDataUrl(rawUrl)) {
    return undefined
  }

  const widthsBySize: Record<ImageSize, number[]> = {
    thumb: [120, 160, 240],
    card: [320, 420, 640],
    medium: [480, 760, 960],
    large: [760, 1200, 1600],
    full: [],
  }

  const widths = widthsBySize[size] || widthsBySize.card
  if (!widths.length) return undefined

  try {
    return widths
      .map((width) => {
        const url = new URL(rawUrl, window.location.origin)

        if (url.hostname.includes('images.unsplash.com')) {
          url.searchParams.set('w', String(width))
          url.searchParams.set('q', '75')
          url.searchParams.set('auto', 'format')
          url.searchParams.set('fit', url.searchParams.get('fit') || 'crop')
          return `${url.toString()} ${width}w`
        }

        if (isOptimizableWordPressImage(url)) {
          return `${buildCloudflareImageUrl(url, width)} ${width}w`
        }

        return ''
      })
      .filter(Boolean)
      .join(', ') || undefined
  } catch {
    return undefined
  }
}

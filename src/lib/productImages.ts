type ProductImageSize = 'thumb' | 'card' | 'medium' | 'large'

type ProductImageLike = {
  image?: string
  imageThumb?: string
  imageCard?: string
  imageMedium?: string
  imageLarge?: string
  imageOriginal?: string
  images?: string[]
}

export const PRODUCT_IMAGE_FALLBACK = '/product-placeholder.svg'

function isUsefulImage(value?: string | null) {
  if (!value || typeof value !== 'string') return false

  const normalized = value.trim().toLowerCase()

  return Boolean(
    normalized &&
      normalized !== 'undefined' &&
      normalized !== 'null' &&
      !normalized.endsWith('/logo.jpg') &&
      normalized !== '/logo.jpg' &&
      !normalized.endsWith('/product-placeholder.svg') &&
      normalized !== PRODUCT_IMAGE_FALLBACK
  )
}

export function getProductImageCandidates(
  product: ProductImageLike | null | undefined,
  size: ProductImageSize = 'card',
) {
  if (!product) return []

  const candidatesBySize: Record<ProductImageSize, Array<string | undefined>> = {
    thumb: [
      product.imageThumb,
      product.imageCard,
      product.imageMedium,
      product.image,
      ...(product.images || []),
      product.imageLarge,
      product.imageOriginal,
    ],
    card: [
      product.imageCard,
      product.imageMedium,
      product.imageThumb,
      product.image,
      ...(product.images || []),
      product.imageLarge,
      product.imageOriginal,
    ],
    medium: [
      product.imageMedium,
      product.imageLarge,
      product.imageCard,
      product.image,
      ...(product.images || []),
      product.imageOriginal,
      product.imageThumb,
    ],
    large: [
      product.imageLarge,
      product.imageOriginal,
      product.imageMedium,
      product.image,
      ...(product.images || []),
      product.imageCard,
      product.imageThumb,
    ],
  }

  return Array.from(
    new Set(
      candidatesBySize[size]
        .filter(isUsefulImage)
        .map((candidate) => String(candidate).trim())
    )
  )
}

export function getFastProductImage(
  product: ProductImageLike | null | undefined,
  size: ProductImageSize = 'card',
) {
  return getProductImageCandidates(product, size)[0] || PRODUCT_IMAGE_FALLBACK
}

export function advanceProductImageFallback(
  image: HTMLImageElement,
  product: ProductImageLike | null | undefined,
  size: ProductImageSize = 'card',
) {
  const candidates = getProductImageCandidates(product, size)
  const absoluteCandidate = (candidate: string) => {
    try {
      return new URL(candidate, image.ownerDocument.baseURI).href
    } catch {
      return candidate
    }
  }
  const currentSource = image.currentSrc || image.src
  const renderedSourceIndex = candidates.findIndex(
    (candidate) => absoluteCandidate(candidate) === currentSource
  )
  const sourceAttributeIndex = candidates.findIndex(
    (candidate) => absoluteCandidate(candidate) === image.src
  )
  const currentIndex = Math.max(renderedSourceIndex, sourceAttributeIndex)
  const attemptedIndex = Number(image.dataset.productImageAttempt || currentIndex)
  const nextIndex = Math.max(currentIndex, attemptedIndex) + 1

  image.srcset = ''
  image.dataset.productImageAttempt = String(nextIndex)

  if (candidates[nextIndex]) {
    image.src = candidates[nextIndex]
    return
  }

  image.onerror = null
  image.src = PRODUCT_IMAGE_FALLBACK
}

export function getFastProductSrcSet(product: ProductImageLike | null | undefined) {
  if (!product) return undefined

  const candidates = [
    [product.imageThumb, '160w'],
    [product.imageCard, '360w'],
    [product.imageMedium, '720w'],
    [product.imageLarge, '1024w'],
  ] as const

  const srcSet = candidates
    .filter(([src]) => isUsefulImage(src))
    .map(([src, width]) => `${src} ${width}`)
    .join(', ')

  return srcSet || undefined
}

export function getProductImageSizes(kind: 'card' | 'search' | 'detail' = 'card') {
  if (kind === 'search') return '64px'

  if (kind === 'detail') {
    return '(max-width: 768px) 100vw, 720px'
  }

  return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px'
}

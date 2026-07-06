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

const FALLBACK_IMAGE = '/logo.jpg'

function isUsefulImage(value?: string | null) {
  return Boolean(value && typeof value === 'string' && value.trim() && value !== 'undefined')
}

export function getFastProductImage(
  product: ProductImageLike | null | undefined,
  size: ProductImageSize = 'card',
) {
  if (!product) return FALLBACK_IMAGE

  if (size === 'thumb') {
    return (
      product.imageThumb ||
      product.imageCard ||
      product.imageMedium ||
      product.image ||
      product.images?.[0] ||
      FALLBACK_IMAGE
    )
  }

  if (size === 'medium') {
    return (
      product.imageMedium ||
      product.imageCard ||
      product.imageLarge ||
      product.image ||
      product.images?.[0] ||
      FALLBACK_IMAGE
    )
  }

  if (size === 'large') {
    return (
      product.imageLarge ||
      product.imageMedium ||
      product.imageOriginal ||
      product.image ||
      product.images?.[0] ||
      FALLBACK_IMAGE
    )
  }

  return (
    product.imageCard ||
    product.imageThumb ||
    product.imageMedium ||
    product.image ||
    product.images?.[0] ||
    FALLBACK_IMAGE
  )
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

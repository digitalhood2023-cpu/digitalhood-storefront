import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Check,
  Heart,
  Minus,
  Plus,
  PackageCheck,
  RotateCcw,
  Share2,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Zap,
  Flame,
  BadgeCheck,
  X,
  ZoomIn,
  ZoomOut,
  MessageCircle,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import RecentlyViewed from '@/sections/RecentlyViewed'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import StockBadge from '@/components/StockBadge'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import {
  fetchWooProductBySlug,
  fetchWooProductVariations,
  fetchWooProducts,
  fetchWooProductReviews,
  isMarketplaceProductAvailable,
  type WooProduct,
  type WooProductReview,
  type WooProductVariation,
} from '@/lib/woocommerce'

import { getShippingDetails } from '@/lib/shipping'
import { getImageSrcSet, getOptimizedImageUrl } from '@/lib/images'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/context/WishlistContext'
import { useRecentlyViewed } from '@/context/RecentlyViewedContext'
import { useAccount } from '@/context/AccountContext'
import { openProductConversation } from '@/api/chat'

import gsap from 'gsap'
import { getFastProductImage } from '@/lib/productImages'
import { acquireBodyScrollLock } from '@/lib/bodyScrollLock'
import {
  deduplicateProductImages,
  getPinchOriginPercent,
} from '@/lib/productGallery'
import {
  extractDescriptionSpecificationRows,
  mergeProductSpecificationRows,
} from '@/lib/productDetails'

function getVariationLabel(variation: WooProductVariation) {
  const values = Object.values(variation.attributes || {}).filter(Boolean)

  if (values.length === 0) {
    return `Variation #${variation.id}`
  }

  return values.join(' / ')
}

function getRatingText(product: WooProduct) {
  if (!product.averageRating || product.ratingCount <= 0) {
    return 'No verified ratings yet'
  }

  return `${product.averageRating.toFixed(1)} ★ · ${product.ratingCount} verified ${
    product.ratingCount === 1 ? 'rating' : 'ratings'
  }`
}

function getSellerInitials(storeName = '') {
  const words = String(storeName || 'DigitalHood')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'DH'
}

function getProductSellerDisplay(product: WooProduct) {
  const storeName =
    product.sellerStoreName ||
    product.seller?.storeName ||
    ''

  const sellerKey =
    product.sellerKey ||
    product.seller?.key ||
    ''

  const sellerUrl =
    product.sellerUrl ||
    product.seller?.url ||
    (sellerKey ? `/seller/${encodeURIComponent(sellerKey)}` : '')

  const isOfficialDigitalHood =
    sellerKey === 'digitalhood' ||
    storeName.toLowerCase() === 'digitalhood'

  const ratingCount = Number(product.ratingCount || product.reviewCount || 0)
  const averageRating = Number(product.averageRating || 0)
  const positivePercent =
    ratingCount > 0 && averageRating > 0
      ? Math.min(100, Math.max(0, Math.round((averageRating / 5) * 100)))
      : isOfficialDigitalHood
        ? 100
        : null

  const sellerAvatarUrl =
    product.sellerAvatarUrl ||
    product.sellerProfilePhotoUrl ||
    product.seller?.avatarUrl ||
    product.seller?.profilePhotoUrl ||
    product.seller?.logoUrl ||
    ''

  return {
    storeName,
    sellerUrl,
    verified: Boolean(product.sellerVerified || product.seller?.verified || isOfficialDigitalHood),
    avatarUrl: sellerAvatarUrl || (isOfficialDigitalHood ? '/logo.jpg' : ''),
    initials: getSellerInitials(storeName),
    feedbackText:
      positivePercent !== null
        ? `${positivePercent}% positive`
        : 'New seller',
  }
}

function getSoldText(product: WooProduct) {
  if (!product.totalSales || product.totalSales <= 0) {
    return ''
  }

  return `${product.totalSales.toLocaleString()} sold`
}

function getProductDescriptionHtml(product: WooProduct) {
  const extendedProduct = product as WooProduct & {
    descriptionHtml?: string
    shortDescriptionHtml?: string
  }

  return (
    extendedProduct.descriptionHtml ||
    extendedProduct.shortDescriptionHtml ||
    product.description ||
    product.shortDescription ||
    ''
  )
}

function getVisibleDescriptionHtml(
  descriptionHtml: string,
  showFullDescription: boolean
) {
  if (!descriptionHtml) return ''

  const shouldTruncate = descriptionHtml.length > 1400

  if (!shouldTruncate || showFullDescription) {
    return descriptionHtml
  }

  return `${descriptionHtml.slice(0, 1400)}...`
}

function formatProductPrice(price: number) {
  return `K${price.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function sortByNewest(products: WooProduct[]) {
  return [...products].sort((a, b) => Number(b.id) - Number(a.id))
}

function sortByHotSelling(products: WooProduct[]) {
  return [...products].sort((a, b) => {
    const salesA = Number(a.totalSales || 0)
    const salesB = Number(b.totalSales || 0)
    const ratingA = Number(a.averageRating || 0)
    const ratingB = Number(b.averageRating || 0)

    return salesB + ratingB - (salesA + ratingA)
  })
}

function getRecommendationBuckets(
  currentProduct: WooProduct,
  candidates: WooProduct[]
) {
  const currentCategoryIds = new Set(currentProduct.categoryIds || [])
  const currentOptions = new Set(
    (currentProduct.attributes || [])
      .flatMap((attribute) => attribute.options || [])
      .map((option) => option.toLowerCase())
  )
  const uniqueCandidates = Array.from(
    new Map(
      candidates
        .filter((candidate) => candidate.id !== currentProduct.id)
        .map((candidate) => [candidate.id, candidate])
    ).values()
  )
  const scored = uniqueCandidates
    .map((candidate) => {
      const categoryMatches = (candidate.categoryIds || []).filter((categoryId) =>
        currentCategoryIds.has(categoryId)
      ).length
      const optionMatches = (candidate.attributes || [])
        .flatMap((attribute) => attribute.options || [])
        .filter((option) => currentOptions.has(option.toLowerCase())).length
      const sameSeller =
        currentProduct.sellerKey && candidate.sellerKey === currentProduct.sellerKey
          ? 1
          : 0
      const score =
        categoryMatches * 8 +
        optionMatches * 2 +
        sameSeller +
        Number(candidate.averageRating || 0) +
        Math.log10(Number(candidate.totalSales || 0) + 1)

      return { candidate, score }
    })
    .sort((left, right) => right.score - left.score)
    .map(({ candidate }) => candidate)

  const similar = scored.slice(0, 8)
  const usedIds = new Set(similar.map((item) => item.id))
  const remaining = uniqueCandidates.filter((item) => !usedIds.has(item.id))
  const newArrivals = sortByNewest(remaining).slice(0, 8)

  for (const item of newArrivals) usedIds.add(item.id)

  const hotSelling = sortByHotSelling(
    uniqueCandidates.filter((item) => !usedIds.has(item.id))
  ).slice(0, 8)

  return { similar, newArrivals, hotSelling }
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<WooProduct | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<WooProduct[]>([])
  const [newArrivalProducts, setNewArrivalProducts] = useState<WooProduct[]>([])
  const [hotSellingProducts, setHotSellingProducts] = useState<WooProduct[]>([])
  const [productReviews, setProductReviews] = useState<WooProductReview[]>([])
  const [areReviewsLoading, setAreReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryScale, setGalleryScale] = useState(1)
  const [galleryZoomOrigin, setGalleryZoomOrigin] = useState({ x: 50, y: 50 })
  const [galleryTouchStartX, setGalleryTouchStartX] = useState<number | null>(null)
  const [galleryTouchStartY, setGalleryTouchStartY] = useState<number | null>(null)
  const [galleryPinchDistance, setGalleryPinchDistance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('description')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [isOpeningChat, setIsOpeningChat] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showVariations, setShowVariations] = useState(false)
  const [selectedAttributes, setSelectedAttributes] =
    useState<Record<string, string>>({})

  const addItem = useCartStore((state) => state.addItem)
  const { toggleWishlist, isInWishlist } = useWishlist()
  const { addToRecentlyViewed } = useRecentlyViewed()
  const { isAuthenticated } = useAccount()

  const pageRef = useRef<HTMLDivElement>(null)
  const galleryViewportRef = useRef<HTMLDivElement>(null)
  const galleryImageRef = useRef<HTMLImageElement>(null)
  const galleryPinchBoundsRef = useRef<DOMRect | null>(null)
  const galleryHistoryStateRef = useRef(false)
  const suppressGalleryTapRef = useRef(false)
  const productTouchGestureRef = useRef<{
    startX: number
    startY: number
    moved: boolean
    multiTouch: boolean
  } | null>(null)
  const productLoadIdRef = useRef(0)

  useEffect(() => {
    if (!slug) return

    const loadId = productLoadIdRef.current + 1
    productLoadIdRef.current = loadId

    setIsLoading(true)
    setLoadError('')
    setSelectedImage(0)
    setIsGalleryOpen(false)
    setGalleryScale(1)
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setGalleryTouchStartX(null)
    setGalleryTouchStartY(null)
    setGalleryPinchDistance(null)
    galleryPinchBoundsRef.current = null
    setSelectedAttributes({})
    setActiveTab('description')
    setQuantity(1)
    setShowFullDescription(false)
    setShowVariations(false)
    setRecommendedProducts([])
    setNewArrivalProducts([])
    setHotSellingProducts([])
    setProductReviews([])
    setReviewsError('')

    fetchWooProductBySlug(slug)
      .then((item) => {
        if (productLoadIdRef.current !== loadId) return

        if (!item || !isMarketplaceProductAvailable(item)) {
          setLoadError(
            item
              ? 'This product is out of stock and is no longer available on the marketplace.'
              : 'Product not found.'
          )
          setProduct(null)
          return
        }

        setProduct(item)
        window.scrollTo(0, 0)

        if (item.type === 'variable') {
          fetchWooProductVariations(item.id)
            .then((variations) => {
              if (productLoadIdRef.current !== loadId) return
              setProduct((current) => current?.id === item.id
                ? {
                    ...current,
                    variations,
                    hasOptions: current.hasOptions || variations.length > 0,
                  }
                : current)
            })
            .catch((error) => console.error('Product options unavailable:', error))
        }

        globalThis.setTimeout(() => {
          if (productLoadIdRef.current !== loadId) return

          setAreReviewsLoading(true)
          fetchWooProductReviews(item.id)
            .then((reviews) => {
              if (productLoadIdRef.current === loadId) setProductReviews(reviews)
            })
            .catch((error) => {
              console.error(error)
              if (productLoadIdRef.current === loadId) {
                setReviewsError('Buyer feedback is temporarily unavailable.')
              }
            })
            .finally(() => {
              if (productLoadIdRef.current === loadId) setAreReviewsLoading(false)
            })

          const categoryId = item.categoryIds?.[0] || item.categories?.[0]?.id || null

          fetchWooProducts(32, 1, '', categoryId)
            .then(({ products }) => {
              if (productLoadIdRef.current !== loadId) return
              const filtered = products.filter(
                (recommended) => recommended.id !== item.id
              )

              const buckets = getRecommendationBuckets(item, filtered)
              setRecommendedProducts(buckets.similar)
              setNewArrivalProducts(buckets.newArrivals)
              setHotSellingProducts(buckets.hotSelling)
            })
            .catch((error) => {
              console.error(error)

              fetchWooProducts(32, 1)
                .then(({ products }) => {
                  if (productLoadIdRef.current !== loadId) return
                  const filtered = products.filter(
                    (recommended) => recommended.id !== item.id
                  )

                  const buckets = getRecommendationBuckets(item, filtered)
                  setRecommendedProducts(buckets.similar)
                  setNewArrivalProducts(buckets.newArrivals)
                  setHotSellingProducts(buckets.hotSelling)
                })
                .catch((fallbackError) => {
                  console.error(fallbackError)
                  if (productLoadIdRef.current !== loadId) return
                  setRecommendedProducts([])
                  setNewArrivalProducts([])
                  setHotSellingProducts([])
                })
            })
        }, 60)
      })
      .catch((error) => {
        if (productLoadIdRef.current !== loadId) return
        console.error(error)

        setLoadError(
          error?.message || 'We could not load this product right now.'
        )
      })
      .finally(() => {
        if (productLoadIdRef.current === loadId) setIsLoading(false)
      })
  }, [slug])

  useEffect(() => {
    if (!product) return

    addToRecentlyViewed({
      id: String(product.id),
      name: product.name,
      slug: product.slug || String(product.id),
      price: Number(product.price || 0),
      image: getFastProductImage(product, 'card'),
      images: product.images || [],
      imageThumb: product.imageThumb,
      imageCard: product.imageCard,
      imageMedium: product.imageMedium,
      imageLarge: product.imageLarge,
      imageOriginal: product.imageOriginal,
      rating: Number(product.averageRating || 0),
      reviews: Number(product.ratingCount || 0),
      category: product.categories?.[0]?.name || 'Marketplace',
      inStock: product.stockStatus !== 'outofstock',
    })
  }, [product, addToRecentlyViewed])

  useEffect(() => {
    if (!product) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.product-image',
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'expo.out',
        }
      )

      gsap.fromTo(
        '.product-info',
        { opacity: 0, x: 20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'expo.out',
          delay: 0.15,
        }
      )
    }, pageRef)

    return () => ctx.revert()
  }, [product])

  async function handleOpenSellerChat() {
    if (!product || isOpeningChat) return

    if (!isAuthenticated) {
      const redirect = `/product/${encodeURIComponent(product.slug || String(product.id))}`

      navigate(
        `/login?redirect=${encodeURIComponent(redirect)}`
      )

      return
    }

    setIsOpeningChat(true)

    try {
      const response =
        await openProductConversation(
          product.id
        )

      navigate(
        `/account/messages/${response.conversationId}`,
        {
          state: {
            pendingProduct:
              response.product
          }
        }
      )
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to open seller chat.'
      )
    } finally {
      setIsOpeningChat(false)
    }
  }

  const hasVariations = Boolean(product?.variations?.length)

  const requiredAttributeNames = useMemo(() => {
    return product?.attributes?.map((attribute) => attribute.name) || []
  }, [product])

  const allRequiredAttributesSelected = useMemo(() => {
    if (!hasVariations) return true

    if (requiredAttributeNames.length === 0) {
      return Object.keys(selectedAttributes).length > 0
    }

    return requiredAttributeNames.every((attributeName) => {
      return Boolean(selectedAttributes[attributeName])
    })
  }, [hasVariations, requiredAttributeNames, selectedAttributes])

  const matchingVariation = useMemo(() => {
    if (!product?.variations?.length) return null

    if (!allRequiredAttributesSelected) return null

    return (
      product.variations.find((variation) => {
        return Object.entries(selectedAttributes).every(
          ([key, value]) => variation.attributes[key] === value
        )
      }) || null
    )
  }, [product, selectedAttributes, allRequiredAttributesSelected])

  const activePrice =
    matchingVariation?.price || product?.price || 0

  const activeImage =
    matchingVariation?.image || product?.image

  const activeStockItem = matchingVariation || product

  const activeStockStatus = String(
    (activeStockItem as any)?.stockStatus ||
    (activeStockItem as any)?.stock_status ||
    ''
  )
  const activeStockQuantityValue =
    (activeStockItem as any)?.stockQuantity ??
    (activeStockItem as any)?.stock_quantity
  const activeStockQuantity = Number(activeStockQuantityValue)
  const activeStockLimit = activeStockStatus !== 'onbackorder' &&
    activeStockQuantityValue !== null &&
    activeStockQuantityValue !== undefined &&
    Number.isFinite(activeStockQuantity)
    ? Math.max(0, Math.floor(activeStockQuantity))
    : null

  const activeCanAddToCart = Boolean(
    activeStockItem &&
      (activeStockItem as any).canAddToCart !== false &&
      (activeStockItem as any).can_add_to_cart !== false &&
      (activeStockItem as any).stockStatus !== 'outofstock' &&
      (activeStockItem as any).stock_status !== 'outofstock' &&
      activeStockLimit !== 0
  )

  const canProceedToBuy = Boolean(
    product &&
      activeCanAddToCart &&
      (!hasVariations || (allRequiredAttributesSelected && matchingVariation))
  )

  const soldText = product ? getSoldText(product) : ''
  const ratingText = product ? getRatingText(product) : ''
  const productDetailRows = useMemo(() => {
    if (!product) return []

    const publicSpecifications = (product.specifications || []).map((item) => ({
      label: item.label,
      value: item.value,
    }))
    const attributeSpecifications = (product.attributes || []).map((attribute) => ({
      label: attribute.name,
      value: (attribute.options || []).join(', '),
    }))
    const descriptionSpecifications = extractDescriptionSpecificationRows(
      getProductDescriptionHtml(product)
    )
    const marketplaceSpecifications = [
      { label: 'Condition', value: product.condition || '' },
      { label: 'Brand', value: product.brand || '' },
      { label: 'SKU', value: product.sku || '' },
    ]

    return mergeProductSpecificationRows(
      publicSpecifications,
      attributeSpecifications,
      descriptionSpecifications,
      marketplaceSpecifications
    )
  }, [product])
  const verifiedReviews = useMemo(
    () => productReviews.filter((review) => review.verified),
    [productReviews]
  )
  const verifiedRating = useMemo(() => {
    if (verifiedReviews.length === 0) return 0

    return (
      verifiedReviews.reduce((sum, review) => sum + review.rating, 0) /
      verifiedReviews.length
    )
  }, [verifiedReviews])
  const sellerDisplay = product
    ? getProductSellerDisplay(product)
    : {
        storeName: '',
        sellerUrl: '',
        verified: false,
        avatarUrl: '',
        initials: 'DH',
        feedbackText: 'New seller',
      }

  const openGallery = (index = selectedImage) => {
    setSelectedImage(index)
    setGalleryScale(1)
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setIsGalleryOpen(true)
  }

  const closeGallery = (options: { skipHistoryBack?: boolean } = {}) => {
    setIsGalleryOpen(false)
    setGalleryScale(1)
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setGalleryTouchStartX(null)
    setGalleryTouchStartY(null)
    setGalleryPinchDistance(null)
    galleryPinchBoundsRef.current = null

    if (!options.skipHistoryBack && galleryHistoryStateRef.current) {
      galleryHistoryStateRef.current = false
      window.history.back()
    }
  }

  useEffect(() => {
    if (!isGalleryOpen) return

    if (!galleryHistoryStateRef.current) {
      window.history.pushState(
        { digitalhoodProductGalleryOpen: true },
        '',
        window.location.href
      )
      galleryHistoryStateRef.current = true
    }

    const handlePopState = () => {
      if (!galleryHistoryStateRef.current) return

      galleryHistoryStateRef.current = false
      closeGallery({ skipHistoryBack: true })
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isGalleryOpen])

  const zoomGalleryIn = () => {
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setGalleryScale((current) => Math.min(3, Number((current + 0.5).toFixed(1))))
  }

  const zoomGalleryOut = () => {
    const nextScale = Math.max(1, Number((galleryScale - 0.5).toFixed(1)))
    setGalleryScale(nextScale)
    if (nextScale === 1) setGalleryZoomOrigin({ x: 50, y: 50 })
  }

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null

    const first = touches[0]
    const second = touches[1]
    const deltaX = first.clientX - second.clientX
    const deltaY = first.clientY - second.clientY

    return Math.hypot(deltaX, deltaY)
  }

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      setGalleryPinchDistance(getTouchDistance(event.touches))
      setGalleryTouchStartX(null)
      setGalleryTouchStartY(null)
      const zoomSurface = galleryImageRef.current || galleryViewportRef.current
      if (zoomSurface) {
        const bounds = zoomSurface.getBoundingClientRect()
        galleryPinchBoundsRef.current = bounds
        setGalleryZoomOrigin(
          getPinchOriginPercent(
            event.touches[0],
            event.touches[1],
            bounds
          )
        )
      }
      return
    }

    setGalleryTouchStartX(event.touches[0]?.clientX ?? null)
    setGalleryTouchStartY(event.touches[0]?.clientY ?? null)
    setGalleryPinchDistance(null)
    galleryPinchBoundsRef.current = null
  }

  const handleGalleryTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) return

    const currentDistance = getTouchDistance(event.touches)

    if (!currentDistance || !galleryPinchDistance) {
      setGalleryPinchDistance(currentDistance)
      return
    }

    event.preventDefault()

    const bounds = galleryPinchBoundsRef.current
    if (bounds) {
      setGalleryZoomOrigin(
        getPinchOriginPercent(
          event.touches[0],
          event.touches[1],
          bounds
        )
      )
    }

    const distanceDelta = currentDistance - galleryPinchDistance

    if (Math.abs(distanceDelta) < 8) return

    setGalleryScale((current) =>
      Math.min(3, Math.max(1, Number((current + distanceDelta / 180).toFixed(2))))
    )
    setGalleryPinchDistance(currentDistance)
  }

  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (galleryPinchDistance !== null || event.changedTouches.length > 1) {
      setGalleryPinchDistance(null)
      galleryPinchBoundsRef.current = null
      setGalleryTouchStartX(null)
      setGalleryTouchStartY(null)
      return
    }

    if (galleryTouchStartX === null || galleryTouchStartY === null) return

    const endX = event.changedTouches[0]?.clientX ?? galleryTouchStartX
    const endY = event.changedTouches[0]?.clientY ?? galleryTouchStartY
    const deltaX = galleryTouchStartX - endX
    const deltaY = galleryTouchStartY - endY

    setGalleryTouchStartX(null)
    setGalleryTouchStartY(null)

    if (
      galleryScale > 1 ||
      Math.abs(deltaX) < 70 ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.5
    ) {
      return
    }

    if (deltaX > 0) {
      goToNextImage()
    } else {
      goToPreviousImage()
    }
  }

  const descriptionHtml = product ? getProductDescriptionHtml(product) : ''
  const hasLongDescription = descriptionHtml.length > 1400
  const visibleDescriptionHtml = getVisibleDescriptionHtml(
    descriptionHtml,
    showFullDescription
  )

  const productImages =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ['/logo.jpg']

  const displayImages = deduplicateProductImages([
    activeImage,
    ...productImages,
  ])
  if (displayImages.length === 0) displayImages.push('/logo.jpg')

  const shipping = getShippingDetails({
    subtotal: activePrice,
    city: 'Lusaka',
    province: 'Lusaka',
  })

  const handleVariationChange = (
    attributeName: string,
    value: string
  ) => {
    setSelectedAttributes((current) => ({
      ...current,
      [attributeName]: value,
    }))

    setSelectedImage(0)
    setQuantity(1)
  }

  const handleDirectVariationSelect = (variation: WooProductVariation) => {
    setSelectedAttributes(variation.attributes || {})
    setSelectedImage(0)
    setQuantity(1)
  }

  const goToPreviousImage = () => {
    if (displayImages.length <= 1) return

    setGalleryScale(1)
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setSelectedImage((current) =>
      current === 0 ? displayImages.length - 1 : current - 1
    )
  }

  const goToNextImage = () => {
    if (displayImages.length <= 1) return

    setGalleryScale(1)
    setGalleryZoomOrigin({ x: 50, y: 50 })
    setSelectedImage((current) =>
      current >= displayImages.length - 1 ? 0 : current + 1
    )
  }

  useEffect(() => {
    if (!isGalleryOpen) return

    const releaseScrollLock = acquireBodyScrollLock()

    const handleGalleryKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeGallery()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setGalleryScale(1)
        setGalleryZoomOrigin({ x: 50, y: 50 })
        setSelectedImage((current) =>
          current === 0 ? displayImages.length - 1 : current - 1
        )
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setGalleryScale(1)
        setGalleryZoomOrigin({ x: 50, y: 50 })
        setSelectedImage((current) =>
          current >= displayImages.length - 1 ? 0 : current + 1
        )
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        setGalleryScale(1)
        setGalleryZoomOrigin({ x: 50, y: 50 })
        setSelectedImage(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        setGalleryScale(1)
        setGalleryZoomOrigin({ x: 50, y: 50 })
        setSelectedImage(Math.max(0, displayImages.length - 1))
        return
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setGalleryScale((current) => Math.min(3, Number((current + 0.5).toFixed(1))))
      }

      if (event.key === '-') {
        event.preventDefault()
        setGalleryScale((current) => Math.max(1, Number((current - 0.5).toFixed(1))))
      }
    }

    document.addEventListener('keydown', handleGalleryKeyDown)

    return () => {
      document.removeEventListener('keydown', handleGalleryKeyDown)
      releaseScrollLock()
    }
  }, [displayImages.length, isGalleryOpen])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    suppressGalleryTapRef.current = false
    const touch = event.touches[0]

    productTouchGestureRef.current = touch
      ? {
          startX: touch.clientX,
          startY: touch.clientY,
          moved: false,
          multiTouch: event.touches.length !== 1,
        }
      : null
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = productTouchGestureRef.current
    if (!gesture) return

    if (event.touches.length !== 1) {
      gesture.multiTouch = true
      return
    }

    const currentX = event.touches[0]?.clientX ?? gesture.startX
    const currentY = event.touches[0]?.clientY ?? gesture.startY

    if (
      Math.abs(currentX - gesture.startX) > 8 ||
      Math.abs(currentY - gesture.startY) > 8
    ) {
      gesture.moved = true
      suppressGalleryTapRef.current = true
    }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = productTouchGestureRef.current
    productTouchGestureRef.current = null
    if (!gesture || gesture.multiTouch) return

    const touchEndX = event.changedTouches[0]?.clientX ?? gesture.startX
    const touchEndY = event.changedTouches[0]?.clientY ?? gesture.startY
    const distanceX = gesture.startX - touchEndX
    const distanceY = gesture.startY - touchEndY

    if (gesture.moved || Math.abs(distanceX) > 8 || Math.abs(distanceY) > 8) {
      suppressGalleryTapRef.current = true
      window.setTimeout(() => {
        suppressGalleryTapRef.current = false
      }, 450)
    }

    if (Math.abs(distanceX) > 45 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      event.preventDefault()
      if (distanceX > 0) {
        goToNextImage()
      } else {
        goToPreviousImage()
      }
      return
    }

    if (!gesture.moved && Math.abs(distanceX) <= 8 && Math.abs(distanceY) <= 8) {
      event.preventDefault()
      suppressGalleryTapRef.current = true
      openGallery(selectedImage)
      window.setTimeout(() => {
        suppressGalleryTapRef.current = false
      }, 450)
    }
  }

  const handleProductImageClick = () => {
    if (suppressGalleryTapRef.current) {
      suppressGalleryTapRef.current = false
      return
    }

    openGallery(selectedImage)
  }

  const buildCartProduct = () => {
    if (!product) return null

    const variationLabel = matchingVariation
      ? getVariationLabel(matchingVariation)
      : ''

    return {
      id: Number(matchingVariation?.id || product.id),
      productId: product.id,
      variationId: matchingVariation?.id,
      variationLabel,
      variationAttributes: matchingVariation?.attributes,
      name: product.name,
      slug: product.slug,
      type: product.type,
      price: activePrice,
      regular_price: activePrice,
      image: activeImage || getFastProductImage(product, 'card'),
      stock_status:
        matchingVariation?.stockStatus ||
        matchingVariation?.stock_status ||
        product.stockStatus ||
        product.stock_status,
      stock_quantity:
        matchingVariation?.stockQuantity ??
        matchingVariation?.stock_quantity ??
        product.stockQuantity ??
        product.stock_quantity,
      manage_stock:
        matchingVariation?.manageStock ??
        matchingVariation?.manage_stock ??
        product.manageStock ??
        product.manage_stock,
      stock_label:
        matchingVariation?.stockLabel ||
        matchingVariation?.stock_label ||
        product.stockLabel ||
        product.stock_label,
      stock_tone:
        matchingVariation?.stockTone ||
        matchingVariation?.stock_tone ||
        product.stockTone ||
        product.stock_tone,
      can_add_to_cart:
        matchingVariation?.canAddToCart ??
        matchingVariation?.can_add_to_cart ??
        product.canAddToCart ??
        product.can_add_to_cart,
      seller: product.seller,
      sellerStoreName: sellerDisplay.storeName,
      sellerKey: product.sellerKey || product.seller?.key || '',
      sellerUrl: sellerDisplay.sellerUrl,
      sellerVerified: sellerDisplay.verified,
      sellerCustomerId: product.sellerCustomerId || product.seller?.customerId || '',
      sellerAvatarUrl: sellerDisplay.avatarUrl,
      sellerFeedbackText: sellerDisplay.feedbackText,
      selectedVariation: matchingVariation
        ? ({
            ...(matchingVariation as any),
            variationLabel,
            variationAttributes: matchingVariation.attributes,
          } as any)
        : null,
    }
  }

  const validateBeforeCartAction = () => {
    if (!product) return false

    if (hasVariations && !allRequiredAttributesSelected) {
      alert('Please select all product options before continuing.')
      setShowVariations(true)
      return false
    }

    if (hasVariations && !matchingVariation) {
      alert('This combination is unavailable. Please choose another option.')
      setShowVariations(true)
      return false
    }

    if (!activeCanAddToCart) {
      alert(
        (activeStockItem as any)?.stockLabel ||
          (activeStockItem as any)?.stock_label ||
          'This product is currently unavailable.'
      )
      return false
    }

    return true
  }

  const handleAddToCart = () => {
    if (!validateBeforeCartAction()) return

    const cartProduct = buildCartProduct()

    if (!cartProduct) return

    const addedToCart = addItem(cartProduct, quantity)

    if (!addedToCart) return

    setAdded(true)

    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }

  const handleBuyNow = () => {
    if (!validateBeforeCartAction()) return

    const cartProduct = buildCartProduct()

    if (!cartProduct) return

    const addedToCart = addItem(cartProduct, quantity)

    if (!addedToCart) return

    const checkoutItemId = Number(cartProduct.variationId || cartProduct.id)
    navigate(`/checkout?items=${checkoutItemId}`)
  }

  const ProductRow = ({
    title,
    subtitle,
    icon,
    products,
  }: {
    title: string
    subtitle: string
    icon: React.ReactNode
    products: WooProduct[]
  }) => {
    if (products.length === 0) return null

    return (
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{icon}</div>

            <div>
              <p className="text-sm font-semibold text-dh-primary">
                {title}
              </p>

              <p className="text-xs text-gray-600">
                {subtitle}
              </p>
            </div>
          </div>

          <Link
            to={
              product?.categories?.[0]
                ? `/shop?category=${product.categories[0].slug}`
                : '/shop'
            }
            className="shrink-0 text-xs font-semibold text-dh-primary underline"
          >
            View more
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.slug}`}
              className="w-36 shrink-0 rounded-2xl border border-dh-light-gray bg-dh-gray p-2 transition hover:border-dh-primary hover:bg-white"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-white">
                <img
                  src={item.image || '/logo.jpg'}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = '/logo.jpg'
                  }}
                />
              </div>

              <p className="line-clamp-2 text-xs font-semibold text-black">
                {item.name}
              </p>

              <p className="mt-1 text-xs font-bold text-black">
                {formatProductPrice(item.price || 0)}
              </p>

              <div className="mt-2">
                <StockBadge item={item as any} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const RecommendationsPanel = ({ mobile = false }: { mobile?: boolean }) => {
    if (!product) return null

    return (
      <div
        className={`rounded-3xl border border-dh-light-gray bg-white p-4 shadow-sm ${
          mobile ? 'mt-6' : 'mt-6'
        }`}
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#ffb54a]" />

          <h2 className="font-semibold text-black">
            Helpful for this product
          </h2>
        </div>

        <ProductRow
          title="Similar products"
          subtitle="Compare options from the same category."
          icon={<BadgeCheck className="h-4 w-4 text-black" />}
          products={recommendedProducts}
        />

        <ProductRow
          title="New arrivals"
          subtitle="Fresh listings recently added to DigitalHood."
          icon={<Sparkles className="h-4 w-4 text-[#ffb54a]" />}
          products={newArrivalProducts}
        />

        <ProductRow
          title="Hot selling"
          subtitle="Popular products buyers are checking out."
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          products={hotSellingProducts}
        />

        {recommendedProducts.length === 0 &&
          newArrivalProducts.length === 0 &&
          hotSellingProducts.length === 0 && (
            <div className="grid gap-3">
              {product.categories?.[0] && (
                <Link
                  to={`/shop?category=${product.categories[0].slug}`}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-black hover:bg-white"
                >
                  <p className="text-sm font-semibold text-dh-primary">
                    See similar products
                  </p>

                  <p className="text-xs text-gray-600">
                    Browse more in {product.categories[0].name}
                  </p>
                </Link>
              )}

              <Link
                to="/shop"
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-black hover:bg-white"
              >
                <p className="text-sm font-semibold text-dh-primary">
                  Recommended marketplace picks
                </p>

                <p className="text-xs text-gray-600">
                  Compare prices, stock and trusted DigitalHood listings.
                </p>
              </Link>
            </div>
          )}

        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-3">
          <div className="flex items-start gap-2">
            <PackageCheck className="mt-0.5 h-4 w-4 text-green-700" />

            <div>
              <p className="text-sm font-semibold text-green-800">
                Buyer confidence
              </p>

              <p className="text-xs text-green-700">
                Pay by Mobile Money, card, or Cash on Delivery where available.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={pageRef}
      className="flex min-h-[100svh] flex-col overflow-x-hidden bg-dh-gray"
    >
      <Header />

      <main className="overflow-x-hidden pb-28 pt-4 lg:pb-16 lg:pt-6">

        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          {isLoading ? (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-2xl" />

              <div>
                <div className="h-8 bg-gray-100 rounded mb-4" />
                <div className="h-6 bg-gray-100 rounded w-1/2 mb-6" />
                <div className="h-24 bg-gray-100 rounded mb-6" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            </div>
          ) : loadError || !product ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
              <h1 className="text-2xl font-bold text-black mb-3">
                Product unavailable
              </h1>

              <p className="text-gray-500 mb-6">
                {loadError ||
                  'This product could not be found.'}
              </p>

              <Link to="/shop">
                <Button className="bg-black text-white hover:bg-[#ffb54a] hover:text-black">
                  Back to Shop
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:gap-6 xl:grid-cols-[0.82fr_1.18fr] xl:gap-8">
              <div className="product-image min-w-0 rounded-3xl bg-white p-3 shadow-sm sm:p-4 lg:self-start">
                <div className="mb-3">
                  <h1 className="break-words font-display text-lg font-black leading-snug text-black sm:text-xl lg:text-2xl">
                    {product.name}
                  </h1>
                </div>

                <div
                  className="relative mb-3 aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-2xl bg-gray-100 sm:mb-4 lg:aspect-[5/4]"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={getOptimizedImageUrl(displayImages[selectedImage], 'large')}
                    srcSet={getImageSrcSet(displayImages[selectedImage], 'large')}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    alt={product.name}
                    className="h-full w-full cursor-zoom-in select-none object-cover"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    draggable={false}
                    onClick={handleProductImageClick}
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openGallery(selectedImage)
                    }}
                    className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-black/80"
                  >
                    Tap to view
                  </button>

                  <div className="absolute top-4 left-4">
                    <StockBadge item={activeStockItem as any} />
                  </div>

                  {displayImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-md transition hover:bg-white sm:flex"
                        aria-label="Previous product image"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-md transition hover:bg-white sm:flex"
                        aria-label="Next product image"
                      >
                        ›
                      </button>

                      <div className="absolute bottom-3 left-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white -translate-x-1/2">
                        {selectedImage + 1} / {displayImages.length}
                      </div>
                    </>
                  )}
                </div>

                {displayImages.length > 1 && (
                  <div className="flex items-center justify-center gap-2 pb-2">
                    {displayImages.map((image, index) => (
                      <button
                        key={`dot-${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          selectedImage === index
                            ? 'w-7 bg-dh-primary'
                            : 'w-2.5 bg-gray-300 hover:bg-gray-500'
                        }`}
                        aria-label={`Show product image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="hidden lg:block">
                  <RecommendationsPanel />
                </div>
              </div>

              <div className="product-info min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:self-start xl:p-6">
                <div className="mb-4">
                  {sellerDisplay.storeName && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dh-light-gray bg-dh-gray p-2.5">
                      <Link
                        to={sellerDisplay.sellerUrl || '/seller/digitalhood'}
                        className="flex min-w-0 items-center gap-2.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-dh-primary shadow-sm">
                          {sellerDisplay.avatarUrl ? (
                            <img
                              src={sellerDisplay.avatarUrl}
                              alt={sellerDisplay.storeName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            sellerDisplay.initials
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black leading-tight text-dh-primary">
                            {sellerDisplay.storeName}
                          </span>
                          <span className="block truncate text-[11px] font-bold leading-tight text-green-700">
                            {sellerDisplay.feedbackText}
                          </span>
                        </span>
                      </Link>

                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          to={sellerDisplay.sellerUrl || '/seller/digitalhood'}
                          className="rounded-full bg-white px-3 py-2 text-xs font-black text-dh-primary transition hover:bg-dh-primary hover:text-white"
                        >
                          Visit store
                        </Link>

                        <button
                          type="button"
                          onClick={handleOpenSellerChat}
                          disabled={isOpeningChat}
                          className="inline-flex items-center gap-1.5 rounded-full bg-dh-primary px-3 py-2 text-xs font-black text-white transition hover:bg-dh-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isOpeningChat ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5" />
                          )}

                          {isOpeningChat ? 'Opening...' : 'Chat'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 rounded-2xl border border-dh-light-gray bg-white p-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
                        <span className="font-display text-xl font-black leading-none text-dh-primary sm:text-2xl">
                          {formatProductPrice(activePrice)}
                        </span>

                        <span className="pb-0.5 text-xs font-black text-green-700 sm:text-sm">
                          {shipping.fee === 0
                            ? '+ free shipping'
                            : `+ ${formatProductPrice(shipping.fee)} shipping`}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-green-700 lg:max-w-[46%]">
                        <Truck className="h-4 w-4 shrink-0" />

                        <div className="relative h-5 min-w-0 flex-1 overflow-hidden text-xs font-black">
                          <div className="animate-[deliveryTicker_7.5s_ease-in-out_infinite]">
                            <p className="h-5 truncate leading-5">
                              {shipping.estimate}
                            </p>

                            <p className="h-5 truncate leading-5">
                              {shipping.isLusaka
                                ? shipping.countdown
                                : shipping.title}
                            </p>

                            <p className="h-5 truncate leading-5">
                              Final delivery fee updates at checkout.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-dh-gray px-2.5 py-1 text-xs font-bold text-dh-primary">
                        <Star className="h-3.5 w-3.5 fill-[#ffb54a] text-[#ffb54a]" />
                        {product.averageRating ? product.averageRating.toFixed(1) : 'No ratings'}
                      </span>

                      {soldText && (
                        <span className="rounded-full bg-dh-gray px-2.5 py-1 text-xs font-bold text-dh-dark-gray">
                          {soldText}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                        <Truck className="h-3.5 w-3.5" />
                        {shipping.title}
                      </span>
                    </div>
                  </div>
                </div>

                {product.attributes.length > 0 && (
                  <div className="space-y-5 mb-6">
                    {product.attributes.map((attribute) => (
                      <div key={attribute.id}>
                        <p className="text-sm font-semibold text-black mb-3">
                          {attribute.name}
                        </p>

                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                          {attribute.options.map((option) => {
                            const isSelected =
                              selectedAttributes[
                                attribute.name
                              ] === option

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  handleVariationChange(
                                    attribute.name,
                                    option
                                  )
                                }
                                className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-sm transition-all ${
                                  isSelected
                                    ? 'bg-black text-white border-black'
                                    : 'border-gray-300 bg-white hover:border-black'
                                }`}
                              >
                                {option}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasVariations && (
                  <div className="mb-6 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-black">
                          Available variations
                        </h3>

                        <p className="text-xs text-gray-500">
                          {matchingVariation
                            ? `Selected: ${getVariationLabel(matchingVariation)}`
                            : 'Choose all options to continue'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowVariations((current) => !current)}
                        className="shrink-0 rounded-full border border-black px-4 py-2 text-xs font-semibold text-black transition hover:bg-black hover:text-white"
                      >
                        {showVariations ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {matchingVariation && !showVariations && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                        <span className="text-sm font-medium text-black">
                          {getVariationLabel(matchingVariation)}
                        </span>

                        <StockBadge item={matchingVariation as any} />
                      </div>
                    )}

                    {showVariations && (
                      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                        {product.variations.map((variation) => {
                          const isSelected = matchingVariation?.id === variation.id
                          const canSelect =
                            variation.canAddToCart !== false &&
                            variation.stockStatus !== 'outofstock'

                          return (
                            <button
                              key={variation.id}
                              type="button"
                              disabled={!canSelect}
                              onClick={() => handleDirectVariationSelect(variation)}
                              className={`min-w-[180px] rounded-xl border px-4 py-3 text-left transition-all ${
                                isSelected
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-200 bg-white hover:border-black'
                              } ${
                                !canSelect
                                  ? 'cursor-not-allowed opacity-50'
                                  : ''
                              }`}
                            >
                              <span className="block text-sm font-medium">
                                {getVariationLabel(variation)}
                              </span>

                              <span className="mt-2 block">
                                <StockBadge item={variation as any} />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6 min-w-0">
                  {product.categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="rounded-full max-w-full truncate"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>

                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((prev) => Math.max(1, prev - 1))
                      }
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="w-14 h-10 rounded-lg border border-gray-300 flex items-center justify-center font-semibold">
                      {quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(activeStockLimit ?? 99, prev + 1))}
                      disabled={activeStockLimit !== null && quantity >= activeStockLimit}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={activeStockLimit !== null && quantity >= activeStockLimit ? `Maximum ${activeStockLimit} available` : 'Increase quantity'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-10 w-10 rounded-xl border-2 ${
                        isInWishlist(String(product.id))
                          ? 'border-red-500 bg-red-50 text-red-500'
                          : 'border-gray-200 hover:border-black'
                      }`}
                      onClick={() => toggleWishlist(product as any)}
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isInWishlist(String(product.id)) ? 'fill-current' : ''
                        }`}
                      />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-10 rounded-xl border-2 border-gray-200 hover:border-black"
                      onClick={() =>
                        navigator.share?.({
                          title: product.name,
                          url: window.location.href,
                        })
                      }
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="mb-8 grid w-full gap-3">
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canProceedToBuy}
                    className={`h-12 rounded-full font-semibold shadow-sm ${
                      !canProceedToBuy
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                        : 'bg-dh-primary text-white hover:bg-[#ffb54a] hover:text-black'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Added
                      </>
                    ) : hasVariations && !allRequiredAttributesSelected ? (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Select options first
                      </>
                    ) : hasVariations && !matchingVariation ? (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Combination unavailable
                      </>
                    ) : !activeCanAddToCart ? (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {(activeStockItem as any)?.stockLabel ||
                          (activeStockItem as any)?.stock_label ||
                          'Unavailable'}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!canProceedToBuy}
                    className={`h-12 rounded-full font-semibold shadow-sm ${
                      !canProceedToBuy
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                        : 'bg-[#ffb54a] text-black hover:bg-dh-primary hover:text-white'
                    }`}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Buy it Now
                  </Button>
                </div>

                <div className="mb-6 grid gap-3 rounded-2xl bg-dh-gray p-3 sm:grid-cols-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-dh-primary shadow-sm">
                      <Truck className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-dh-primary">
                      Zambia delivery
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-dh-primary shadow-sm">
                      <Shield className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-dh-primary">
                      Secure checkout
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-dh-primary shadow-sm">
                      <RotateCcw className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-dh-primary">
                      Support available
                    </span>
                  </div>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="rounded-2xl bg-dh-gray p-2.5"
                >
                  <TabsList className="grid h-auto w-full grid-cols-3 overflow-hidden rounded-2xl bg-white p-1">
                    <TabsTrigger
                      value="description"
                      className="min-w-0 rounded-xl px-2 py-2.5 text-xs font-black text-dh-dark-gray transition data-[state=active]:bg-dh-primary data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      Description
                    </TabsTrigger>

                    <TabsTrigger
                      value="details"
                      className="min-w-0 rounded-xl px-2 py-2.5 text-xs font-black text-dh-dark-gray transition data-[state=active]:bg-dh-primary data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      Details
                    </TabsTrigger>

                    <TabsTrigger
                      value="trust"
                      className="min-w-0 rounded-xl px-1.5 py-2.5 text-[11px] font-black text-dh-dark-gray transition data-[state=active]:bg-dh-primary data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                    >
                      Trust/Feedback
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="mt-3 rounded-2xl bg-white p-4">
                    {descriptionHtml ? (
                      <div>
                        <div
                          className="max-w-none overflow-hidden text-sm leading-relaxed text-dh-dark-gray [&_a]:text-dh-primary [&_a]:underline [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-dh-light-gray [&_img]:shadow-sm [&_li]:ml-5 [&_ol]:mb-4 [&_p]:mb-4 [&_strong]:text-dh-primary [&_table]:block [&_table]:overflow-x-auto [&_ul]:mb-4"
                          dangerouslySetInnerHTML={{
                            __html: visibleDescriptionHtml,
                          }}
                        />

                        {hasLongDescription && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowFullDescription((current) => !current)
                            }
                            className="mt-4 rounded-full border border-dh-primary px-5 py-2 text-sm font-semibold text-dh-primary transition hover:bg-dh-primary hover:text-white"
                          >
                            {showFullDescription
                              ? 'Show less'
                              : 'Load full description'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 leading-relaxed break-words">
                        Product details are managed from WooCommerce.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="mt-3 rounded-2xl bg-white p-4">
                    <div className="space-y-4">
                      <div className="flex items-end justify-between gap-3 border-b border-dh-light-gray pb-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b77716]">
                            Product information
                          </p>
                          <h2 className="mt-0.5 font-display text-lg font-black text-dh-primary">
                            Item specifications
                          </h2>
                        </div>
                        {productDetailRows.length > 0 && (
                          <span className="shrink-0 rounded-full bg-dh-gray px-2.5 py-1 text-xs font-black text-dh-primary">
                            {productDetailRows.length}
                          </span>
                        )}
                      </div>

                      {productDetailRows.length > 0 ? (
                        <dl className="overflow-hidden rounded-2xl border border-dh-light-gray">
                          {productDetailRows.map((detail, index) => (
                            <div
                              key={`${detail.label}-${detail.value}`}
                              className={`grid grid-cols-[minmax(105px,0.42fr)_minmax(0,0.58fr)] gap-3 px-3 py-2.5 text-sm sm:grid-cols-[minmax(150px,0.38fr)_minmax(0,0.62fr)] sm:px-4 ${
                                index % 2 === 0 ? 'bg-dh-gray' : 'bg-white'
                              }`}
                            >
                              <dt className="font-bold text-dh-dark-gray">
                                {detail.label}
                              </dt>
                              <dd className="min-w-0 break-words font-semibold text-dh-primary">
                                {detail.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-dh-light-gray bg-dh-gray px-4 py-5 text-sm text-dh-dark-gray">
                          This seller has not added item specifications yet.
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex justify-between gap-3 rounded-xl bg-dh-gray px-3 py-2.5">
                          <span className="text-sm font-semibold text-dh-dark-gray">
                            Product type
                          </span>
                          <span className="text-right text-sm font-bold capitalize text-dh-primary">
                            {product.type}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3 rounded-xl bg-dh-gray px-3 py-2.5">
                        <span className="text-sm font-semibold text-dh-dark-gray">
                          Availability
                        </span>

                        <span className="font-medium text-right">
                          <StockBadge item={activeStockItem as any} />
                        </span>
                        </div>

                      {sellerDisplay.storeName && (
                        <div className="flex justify-between gap-3 rounded-xl bg-dh-gray px-3 py-2.5">
                          <span className="text-sm font-semibold text-dh-dark-gray">
                            Store
                          </span>

                          <Link
                            to={sellerDisplay.sellerUrl || '/seller/digitalhood'}
                            className="text-right font-black text-dh-primary transition hover:text-[#ffb54a]"
                          >
                            {sellerDisplay.storeName}
                          </Link>
                        </div>
                      )}

                      <div className="flex justify-between gap-3 rounded-xl bg-dh-gray px-3 py-2.5">
                        <span className="text-sm font-semibold text-dh-dark-gray">
                          Rating
                        </span>

                        <span className="font-medium text-right">
                          {ratingText}
                        </span>
                      </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trust" className="mt-3 rounded-2xl bg-white p-4">
                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-dh-light-gray bg-dh-gray p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-dh-dark-gray">
                              Verified buyer feedback
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-display text-3xl font-black text-dh-primary">
                                {verifiedRating > 0 ? verifiedRating.toFixed(1) : '—'}
                              </span>
                              <span className="flex items-center gap-0.5" aria-label={`${verifiedRating.toFixed(1)} out of 5 stars`}>
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <Star
                                    key={index}
                                    className={`h-4 w-4 ${
                                      index < Math.round(verifiedRating)
                                        ? 'fill-[#ffb54a] text-[#ffb54a]'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </span>
                            </div>
                          </div>

                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-dh-primary shadow-sm">
                            {verifiedReviews.length} verified purchase{verifiedReviews.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {areReviewsLoading ? (
                          <p className="mt-4 text-sm font-semibold text-dh-dark-gray">
                            Loading buyer feedback...
                          </p>
                        ) : reviewsError ? (
                          <p className="mt-4 text-sm font-semibold text-red-700">
                            {reviewsError}
                          </p>
                        ) : verifiedReviews.length > 0 ? (
                          <div className="mt-4 grid gap-3">
                            {verifiedReviews.slice(0, 8).map((review) => (
                              <article key={review.id} className="rounded-2xl bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="font-black text-dh-primary">
                                      {review.reviewer}
                                    </p>
                                    <div className="mt-1 flex items-center gap-1">
                                      {Array.from({ length: 5 }).map((_, index) => (
                                        <Star
                                          key={index}
                                          className={`h-3.5 w-3.5 ${
                                            index < review.rating
                                              ? 'fill-[#ffb54a] text-[#ffb54a]'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    Verified purchase
                                  </span>
                                </div>
                                {review.title && (
                                  <p className="mt-3 text-sm font-black text-dh-primary">
                                    {review.title}
                                  </p>
                                )}
                                {review.review && (
                                  <p className={`${review.title ? 'mt-1' : 'mt-3'} text-sm leading-6 text-dh-dark-gray`}>
                                    {review.review}
                                  </p>
                                )}
                                {review.tags && review.tags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {review.tags.slice(0, 6).map((tag) => (
                                      <span key={tag} className="rounded-full bg-dh-gray px-2 py-1 text-[10px] font-bold capitalize text-dh-primary">
                                        {tag.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {review.media && review.media.length > 0 && (
                                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {review.media.map((media, index) => media.type === 'video' ? (
                                      <video key={`${media.url}-${index}`} src={media.url} controls preload="metadata" className="aspect-square w-full rounded-xl bg-black object-cover" />
                                    ) : (
                                      <a key={`${media.url}-${index}`} href={media.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-dh-gray">
                                        <img src={media.thumbnailUrl || media.url} alt="Buyer feedback" loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {review.response?.text && (
                                  <div className="mt-3 rounded-xl border-l-2 border-[#ffb54a] bg-dh-gray p-3 text-xs leading-5 text-dh-dark-gray">
                                    <span className="font-black text-dh-primary">Seller response: </span>
                                    {review.response.text}
                                  </div>
                                )}
                                {review.dateCreated && (
                                  <p className="mt-2 text-xs font-semibold text-gray-500">
                                    {new Date(review.dateCreated).toLocaleDateString('en-ZM', {
                                      dateStyle: 'medium',
                                    })}
                                  </p>
                                )}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-dh-dark-gray">
                            No verified purchase feedback has been posted for this product yet.
                          </p>
                        )}
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">
                            Verified marketplace checkout
                          </p>
                          <p className="mt-1 text-sm text-green-700">
                            Your order is processed through DigitalHood Marketplace.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl bg-dh-gray p-4">
                        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-dh-primary" />
                        <div>
                          <p className="font-semibold text-dh-primary">
                            Multiple payment options
                          </p>
                          <p className="mt-1 text-sm text-dh-dark-gray">
                            Pay with Mobile Money, card, or Cash on Delivery where available.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl bg-dh-gray p-4">
                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-dh-primary" />
                        <div>
                          <p className="font-semibold text-dh-primary">
                            Zambia-wide delivery support
                          </p>
                          <p className="mt-1 text-sm text-dh-dark-gray">
                            Delivery fee and estimate are confirmed at checkout.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="lg:hidden">
                  <RecommendationsPanel mobile />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {product && !isLoading && !loadError && (
        <RecentlyViewed excludeProductId={String(product.id)} />
      )}

      {product && !isLoading && !loadError && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-dh-light-gray bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-dh-dark-gray">
                {product.name}
              </p>
              <p className="font-display text-lg font-bold text-dh-primary">
                {formatProductPrice(activePrice)}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAddToCart}
              disabled={!canProceedToBuy}
              className={`shrink-0 rounded-full px-5 font-semibold ${
                !canProceedToBuy
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                  : 'bg-dh-primary text-white hover:bg-dh-secondary'
              }`}
            >
              {added ? 'Added' : 'Add'}
            </Button>

            <Button
              type="button"
              onClick={handleBuyNow}
              disabled={!canProceedToBuy}
              className={`shrink-0 rounded-full px-5 font-semibold ${
                !canProceedToBuy
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                  : 'bg-[#ffb54a] text-black hover:bg-dh-primary hover:text-white'
              }`}
            >
              Buy
            </Button>
          </div>
        </div>
      )}

      {product && isGalleryOpen && (
        <div
          className="fixed inset-0 z-[100] flex touch-none flex-col bg-black/95 text-white"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image gallery`}
          onTouchStart={handleGalleryTouchStart}
          onTouchMove={handleGalleryTouchMove}
          onTouchEnd={handleGalleryTouchEnd}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
            onTouchStart={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {product.name}
              </p>
              <p className="text-xs text-white/65">
                {selectedImage + 1} / {displayImages.length}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={zoomGalleryOut}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={zoomGalleryIn}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeGallery()
                }}
                onTouchEnd={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeGallery()
                }}
                onPointerUp={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeGallery()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-[#ffb54a]"
                aria-label="Close gallery"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={galleryViewportRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-4"
          >
            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={goToPreviousImage}
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl font-light transition hover:bg-white/20 sm:flex"
                aria-label="Previous image"
              >
                ‹
              </button>
            )}

            <img
              ref={galleryImageRef}
              src={displayImages[selectedImage]}
              alt={product.name}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
              style={{
                transform: `scale(${galleryScale})`,
                transformOrigin: `${galleryZoomOrigin.x}% ${galleryZoomOrigin.y}%`,
              }}
              draggable={false}
            />

            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={goToNextImage}
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl font-light transition hover:bg-white/20 sm:flex"
                aria-label="Next image"
              >
                ›
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
            {displayImages.map((image, index) => (
              <button
                key={`fullscreen-${image}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedImage(index)
                  setGalleryScale(1)
                  setGalleryZoomOrigin({ x: 50, y: 50 })
                }}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  selectedImage === index
                    ? 'border-[#ffb54a]'
                    : 'border-white/15 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

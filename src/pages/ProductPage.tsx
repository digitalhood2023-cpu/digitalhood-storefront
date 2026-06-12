import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Check,
  Clock,
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
  fetchWooProducts,
  type WooProduct,
  type WooProductVariation,
} from '@/lib/woocommerce'

import { getShippingDetails } from '@/lib/shipping'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/context/WishlistContext'
import { useRecentlyViewed } from '@/context/RecentlyViewedContext'

import gsap from 'gsap'

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

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<WooProduct | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<WooProduct[]>([])
  const [newArrivalProducts, setNewArrivalProducts] = useState<WooProduct[]>([])
  const [hotSellingProducts, setHotSellingProducts] = useState<WooProduct[]>([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryScale, setGalleryScale] = useState(1)
  const [galleryTouchStartX, setGalleryTouchStartX] = useState<number | null>(null)
  const [galleryTouchStartY, setGalleryTouchStartY] = useState<number | null>(null)
  const [galleryPinchDistance, setGalleryPinchDistance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('description')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showVariations, setShowVariations] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const [selectedAttributes, setSelectedAttributes] =
    useState<Record<string, string>>({})

  const addItem = useCartStore((state) => state.addItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const { toggleWishlist, isInWishlist } = useWishlist()
  const { addToRecentlyViewed } = useRecentlyViewed()

  const pageRef = useRef<HTMLDivElement>(null)
  const galleryHistoryStateRef = useRef(false)

  useEffect(() => {
    if (!slug) return

    setIsLoading(true)
    setLoadError('')
    setSelectedImage(0)
    setIsGalleryOpen(false)
    setGalleryScale(1)
    setGalleryTouchStartX(null)
    setGalleryTouchStartY(null)
    setGalleryPinchDistance(null)
    setGalleryTouchStartY(null)
    setGalleryPinchDistance(null)
    setSelectedAttributes({})
    setQuantity(1)
    setShowFullDescription(false)
    setShowVariations(false)
    setRecommendedProducts([])
    setNewArrivalProducts([])
    setHotSellingProducts([])

    fetchWooProductBySlug(slug)
      .then((item) => {
        if (!item) {
          setLoadError('Product not found.')
          setProduct(null)
          return
        }

        setProduct(item)
        window.scrollTo(0, 0)

        const categoryId = item.categoryIds?.[0] || item.categories?.[0]?.id || null

        fetchWooProducts(16, 1, '', categoryId)
          .then(({ products }) => {
            const filtered = products.filter(
              (recommended) => recommended.id !== item.id
            )

            setRecommendedProducts(filtered.slice(0, 8))
            setNewArrivalProducts(sortByNewest(filtered).slice(0, 8))
            setHotSellingProducts(sortByHotSelling(filtered).slice(0, 8))
          })
          .catch((error) => {
            console.error(error)

            fetchWooProducts(16, 1)
              .then(({ products }) => {
                const filtered = products.filter(
                  (recommended) => recommended.id !== item.id
                )

                setRecommendedProducts(filtered.slice(0, 8))
                setNewArrivalProducts(sortByNewest(filtered).slice(0, 8))
                setHotSellingProducts(sortByHotSelling(filtered).slice(0, 8))
              })
              .catch((fallbackError) => {
                console.error(fallbackError)
                setRecommendedProducts([])
                setNewArrivalProducts([])
                setHotSellingProducts([])
              })
          })
      })
      .catch((error) => {
        console.error(error)

        setLoadError(
          error?.message || 'We could not load this product right now.'
        )
      })
      .finally(() => setIsLoading(false))
  }, [slug])

  useEffect(() => {
    if (!product) return

    addToRecentlyViewed({
      id: String(product.id),
      name: product.name,
      slug: product.slug || String(product.id),
      price: Number(product.price || 0),
      image: product.image || product.images?.[0] || '/logo.jpg',
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

  const activeCanAddToCart = Boolean(
    activeStockItem &&
      (activeStockItem as any).canAddToCart !== false &&
      (activeStockItem as any).can_add_to_cart !== false &&
      (activeStockItem as any).stockStatus !== 'outofstock' &&
      (activeStockItem as any).stock_status !== 'outofstock'
  )

  const canProceedToBuy = Boolean(
    product &&
      activeCanAddToCart &&
      (!hasVariations || (allRequiredAttributesSelected && matchingVariation))
  )

  const soldText = product ? getSoldText(product) : ''
  const ratingText = product ? getRatingText(product) : ''
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
    setIsGalleryOpen(true)
  }

  const closeGallery = (options: { skipHistoryBack?: boolean } = {}) => {
    setIsGalleryOpen(false)
    setGalleryScale(1)
    setGalleryTouchStartX(null)
    setGalleryTouchStartY(null)
    setGalleryPinchDistance(null)

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
    setGalleryScale((current) => Math.min(3, Number((current + 0.5).toFixed(1))))
  }

  const zoomGalleryOut = () => {
    setGalleryScale((current) => Math.max(1, Number((current - 0.5).toFixed(1))))
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
      return
    }

    setGalleryTouchStartX(event.touches[0]?.clientX ?? null)
    setGalleryTouchStartY(event.touches[0]?.clientY ?? null)
    setGalleryPinchDistance(null)
  }

  const handleGalleryTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) return

    const currentDistance = getTouchDistance(event.touches)

    if (!currentDistance || !galleryPinchDistance) {
      setGalleryPinchDistance(currentDistance)
      return
    }

    event.preventDefault()

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

  const displayImages = activeImage
    ? [
        activeImage,
        ...productImages.filter((img) => img !== activeImage),
      ]
    : productImages

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
  }

  const handleDirectVariationSelect = (variation: WooProductVariation) => {
    setSelectedAttributes(variation.attributes || {})
    setSelectedImage(0)
  }

  const goToPreviousImage = () => {
    if (displayImages.length <= 1) return

    setSelectedImage((current) =>
      current === 0 ? displayImages.length - 1 : current - 1
    )
  }

  const goToNextImage = () => {
    if (displayImages.length <= 1) return

    setSelectedImage((current) =>
      current >= displayImages.length - 1 ? 0 : current + 1
    )
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX
    const distance = touchStartX - touchEndX

    if (Math.abs(distance) > 45) {
      if (distance > 0) {
        goToNextImage()
      } else {
        goToPreviousImage()
      }
    }

    setTouchStartX(null)
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
      image: activeImage || product.image || '/logo.jpg',
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

    clearCart()

    const addedToCart = addItem(cartProduct, quantity)

    if (!addedToCart) return

    navigate('/checkout')
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
      className="min-h-screen overflow-x-hidden bg-dh-gray"
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
                  className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100 sm:mb-4 lg:aspect-[5/4]"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onPointerUp={(event) => {
                    if (event.pointerType !== 'mouse' && touchStartX === null) {
                      openGallery(selectedImage)
                    }
                  }}
                >
                  <img
                    src={displayImages[selectedImage]}
                    alt={product.name}
                    className="h-full w-full cursor-zoom-in object-cover"
                    onClick={() => openGallery(selectedImage)}
                    onTouchEnd={(event) => {
                      if (touchStartX !== null) return
                      event.preventDefault()
                      event.stopPropagation()
                      openGallery(selectedImage)
                    }}
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openGallery(selectedImage)
                    }}
                    onTouchEnd={(event) => {
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
                          onClick={() => alert('Seller chat is coming soon.')}
                          className="inline-flex items-center gap-1.5 rounded-full bg-dh-primary px-3 py-2 text-xs font-black text-white transition hover:bg-dh-secondary"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chat
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dh-light-gray bg-white p-2.5">
                    <span className="font-display text-xl font-black text-dh-primary sm:text-2xl">
                      {formatProductPrice(activePrice)}
                    </span>

                    <StockBadge item={activeStockItem as any} />

                    <span className="inline-flex items-center gap-1 rounded-full bg-dh-gray px-2.5 py-1 text-xs font-bold text-dh-primary">
                      <Star className="h-3.5 w-3.5 fill-[#ffb54a] text-[#ffb54a]" />
                      {product.averageRating ? product.averageRating.toFixed(1) : 'No ratings'}
                    </span>

                    {soldText && (
                      <span className="rounded-full bg-dh-gray px-2.5 py-1 text-xs font-bold text-dh-dark-gray">
                        {soldText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-5 overflow-hidden rounded-2xl border border-green-100 bg-green-50">
                  <div className="flex animate-[pulse_3s_ease-in-out_infinite] flex-col gap-2.5 p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <Truck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />

                      <div>
                        <p className="font-semibold text-green-800">
                          {shipping.title}:{' '}
                          {shipping.fee === 0
                            ? 'Free'
                            : formatProductPrice(shipping.fee)}
                        </p>

                        <p className="text-sm text-green-700">
                          {shipping.estimate}
                        </p>
                      </div>
                    </div>

                    {shipping.isLusaka && (
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />

                        <p className="text-sm font-medium text-green-800">
                          {shipping.countdown}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-green-700">
                      Final delivery fee updates automatically at checkout.
                    </p>
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
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center"
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
                  <TabsList className="grid w-full grid-cols-3 overflow-hidden rounded-2xl bg-white p-1">
                    <TabsTrigger value="description">
                      Description
                    </TabsTrigger>

                    <TabsTrigger value="details">
                      Details
                    </TabsTrigger>

                    <TabsTrigger value="trust">
                      Trust
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
                    <div className="space-y-3">
                      <div className="flex justify-between gap-4 rounded-2xl bg-dh-gray px-4 py-3">
                        <span className="text-sm font-semibold text-dh-dark-gray">
                          Product type
                        </span>

                        <span className="font-medium capitalize text-right break-words">
                          {product.type}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 rounded-2xl bg-dh-gray px-4 py-3">
                        <span className="text-sm font-semibold text-dh-dark-gray">
                          Availability
                        </span>

                        <span className="font-medium text-right">
                          <StockBadge item={activeStockItem as any} />
                        </span>
                      </div>

                      {sellerDisplay.storeName && (
                        <div className="flex justify-between gap-4 rounded-2xl bg-dh-gray px-4 py-3">
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

                      <div className="flex justify-between gap-4 rounded-2xl bg-dh-gray px-4 py-3">
                        <span className="text-sm font-semibold text-dh-dark-gray">
                          Rating
                        </span>

                        <span className="font-medium text-right">
                          {ratingText}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trust" className="mt-3 rounded-2xl bg-white p-4">
                    <div className="grid gap-3">
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
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
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

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-4">
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
              src={displayImages[selectedImage]}
              alt={product.name}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
              style={{ transform: `scale(${galleryScale})` }}
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
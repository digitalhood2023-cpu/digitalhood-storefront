import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  ShoppingCart,
  Star,
  Eye,
  Check,
  ArrowRight,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useWishlist } from '@/context/WishlistContext'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type ShowcaseProduct = {
  id: string
  name: string
  slug?: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  rating: number
  reviews: number
  badge?: string
  category: string
  type?: string
  hasOptions?: boolean
  stockStatus?: string
  stockLabel?: string
  stockTone?: 'success' | 'warning' | 'danger' | 'muted'
  canAddToCart?: boolean
  inStock?: boolean
  seller?: {
    id?: string
    customerId?: string | number
    storeName?: string
    key?: string
    url?: string
    verified?: boolean
  } | null
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
}

interface ProductShowcaseProps {
  title: string
  subtitle: string
  products: ShowcaseProduct[]
  viewAllLink: string
  bgColor?: 'white' | 'gray'
}

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function getProductUrl(product: ShowcaseProduct) {
  return `/product/${product.slug || product.id}`
}

function getStockInfo(product: ShowcaseProduct) {
  const stockStatus = String(product.stockStatus || '').toLowerCase()
  const stockLabel = product.stockLabel || ''

  if (product.canAddToCart === false || product.inStock === false || stockStatus === 'outofstock') {
    return {
      label: stockLabel || 'Out of stock',
      className: 'bg-red-50 text-red-700 border-red-100',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      canAdd: false,
    }
  }

  if (stockStatus === 'onbackorder') {
    return {
      label: stockLabel || 'Available on backorder',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      canAdd: true,
    }
  }

  if (
    product.stockTone === 'warning' ||
    stockLabel.toLowerCase().includes('left') ||
    stockLabel.toLowerCase().includes('almost')
  ) {
    return {
      label: stockLabel || 'Limited stock',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      canAdd: Boolean(product.canAddToCart ?? true),
    }
  }

  return {
    label: stockLabel || 'In stock',
    className: 'bg-green-50 text-green-700 border-green-100',
    icon: <PackageCheck className="h-3.5 w-3.5" />,
    canAdd: Boolean(product.canAddToCart ?? true),
  }
}

function getSellerDisplay(product: ShowcaseProduct) {
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

  return {
    storeName,
    sellerUrl,
    verified: Boolean(product.sellerVerified || product.seller?.verified),
  }
}

function getBadgeClass(badge?: string) {
  const normalized = String(badge || '').toLowerCase()

  if (normalized.includes('sale') || normalized.includes('deal')) {
    return 'bg-red-500 text-white'
  }

  if (normalized.includes('hot')) {
    return 'bg-orange-500 text-white'
  }

  if (normalized.includes('new')) {
    return 'bg-green-500 text-white'
  }

  if (normalized.includes('best')) {
    return 'bg-purple-500 text-white'
  }

  if (normalized.includes('trend')) {
    return 'bg-blue-500 text-white'
  }

  return 'bg-[#ffb54a] text-black'
}

export default function ProductShowcase({
  title,
  subtitle,
  products,
  viewAllLink,
  bgColor = 'white',
}: ProductShowcaseProps) {
  const addItem = useCartStore((state) => state.addItem)
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.showcase-header',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      )

      gsap.fromTo(
        '.showcase-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.showcase-grid',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [products.length])

  const handleAddToCart = (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ShowcaseProduct
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const productUrl = getProductUrl(product)
    const stock = getStockInfo(product)

    if (product.hasOptions || product.type === 'variable') {
      window.location.href = productUrl
      return
    }

    if (!stock.canAdd) {
      toast.error(stock.label || 'This product is currently unavailable.')
      return
    }

    addItem(
      {
        id: Number(product.id),
        name: product.name,
        slug: product.slug || product.id,
        price: safeNumber(product.price),
        regular_price: product.originalPrice || product.price,
        image: product.image || product.images?.[0] || '/logo.jpg',
        seller: product.seller,
        sellerStoreName: product.sellerStoreName || product.seller?.storeName || 'DigitalHood',
        sellerKey: product.sellerKey || product.seller?.key || 'digitalhood',
        sellerUrl: product.sellerUrl || product.seller?.url || '/seller/digitalhood',
        sellerVerified: Boolean(product.sellerVerified || product.seller?.verified || product.sellerKey === 'digitalhood'),
        sellerCustomerId: product.sellerCustomerId || product.seller?.customerId || '',
        sellerAvatarUrl: product.sellerKey === 'digitalhood' ? '/logo.jpg' : '',
        sellerFeedbackText: product.sellerKey === 'digitalhood' ? '100% positive' : 'New seller',
      },
      1
    )

    toast.success(`${product.name} added to cart`)
    setAddedToCart(product.id)

    setTimeout(() => {
      setAddedToCart(null)
    }, 2000)
  }

  const formatPrice = (price: number) =>
    `K${safeNumber(price).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const bgClass = bgColor === 'gray' ? 'bg-gray-50' : 'bg-white'

  if (products.length === 0) {
    return null
  }

  return (
    <section ref={sectionRef} className={`py-9 lg:py-12 ${bgClass}`}>
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="showcase-header mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-black text-black sm:text-3xl">
              {title}
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-gray-600 sm:text-base">{subtitle}</p>
          </div>

          <Link to={viewAllLink}>
            <Button
              variant="outline"
              className="h-10 rounded-full border border-black px-5 text-sm font-bold text-black hover:bg-black hover:text-white"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="showcase-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products.map((product) => {
            const productUrl = getProductUrl(product)
            const stock = getStockInfo(product)
            const productImage = product.image || product.images?.[0] || '/logo.jpg'
            const isVariable = product.hasOptions || product.type === 'variable'
            const sellerDisplay = getSellerDisplay(product)

            return (
              <div
                key={product.id}
                className="showcase-card group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Link to={productUrl}>
                    <img
                      src={productImage}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.src = '/logo.jpg'
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </Link>

                  <div className="absolute left-2 top-2 flex max-w-[80%] flex-col gap-1">
                    {product.badge && (
                      <Badge className={`${getBadgeClass(product.badge)} text-xs font-semibold`}>
                        {product.badge}
                      </Badge>
                    )}
                  </div>

                  <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => toggleWishlist(product as any)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 ${
                        isInWishlist(product.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-600 hover:text-red-500'
                      }`}
                      aria-label="Toggle wishlist"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isInWishlist(product.id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>

                    <Link
                      to={productUrl}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 transition-all hover:scale-110 hover:text-black"
                      aria-label="View product"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-0 transition-transform duration-300 sm:translate-y-full sm:group-hover:translate-y-0">
                    <Button
                      onClick={(event) => handleAddToCart(event, product)}
                      className={`w-full rounded-lg text-xs transition-all ${
                        addedToCart === product.id
                          ? 'bg-green-500 hover:bg-green-600'
                          : !stock.canAdd
                            ? 'bg-gray-400 hover:bg-gray-400'
                            : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                      } text-white`}
                      size="sm"
                    >
                      {addedToCart === product.id ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Added
                        </>
                      ) : isVariable ? (
                        <>
                          <ArrowRight className="mr-1 h-3 w-3" />
                          Options
                        </>
                      ) : !stock.canAdd ? (
                        'Unavailable'
                      ) : (
                        <>
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5">
                  <div className="mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#ffb54a] text-[#ffb54a]" />
                    <span className="text-xs font-medium">
                      {safeNumber(product.rating).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({safeNumber(product.reviews)})
                    </span>
                  </div>

                  <Link to={productUrl}>
                    <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-black transition-colors hover:text-[#ffb54a]">
                      {product.name}
                    </h3>
                  </Link>

                  {sellerDisplay.storeName && (
                    <Link
                      to={sellerDisplay.sellerUrl || '/seller/digitalhood'}
                      className="mb-2 inline-flex max-w-full items-center gap-1 text-[11px] font-bold text-dh-dark-gray transition-colors hover:text-dh-primary"
                    >
                      <span className="truncate">
                        Sold by <span className="text-dh-primary">{sellerDisplay.storeName}</span>
                      </span>
                      {sellerDisplay.verified && (
                        <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-black text-green-700">
                          Verified
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-display text-sm font-bold">
                      {formatPrice(product.price)}
                    </span>

                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  <div
                    className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${stock.className}`}
                  >
                    {stock.icon}
                    <span className="truncate">{stock.label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

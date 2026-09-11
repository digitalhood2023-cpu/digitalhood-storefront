import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Clock, Flame, Check, ArrowRight } from 'lucide-react'

import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { type WooProduct } from '@/lib/woocommerce'
import { emitMarketplaceEvent } from '@/lib/marketplaceAnalytics'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getFastProductImage, getFastProductSrcSet, getProductImageSizes } from '@/lib/productImages'

gsap.registerPlugin(ScrollTrigger)

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function productHasDeal(product: WooProduct) {
  const priceHtml = String(product.priceHtml || '').toLowerCase()
  const stockLabel = String(product.stockLabel || '').toLowerCase()

  return (
    product.onSale === true ||
    priceHtml.includes('del') ||
    priceHtml.includes('ins') ||
    priceHtml.includes('sale') ||
    stockLabel.includes('sale') ||
    stockLabel.includes('deal')
  )
}

function getOriginalPrice(product: WooProduct) {
  if (safeNumber(product.regularPrice) > safeNumber(product.price)) {
    return safeNumber(product.regularPrice)
  }

  const priceHtml = String(product.priceHtml || '')
  const delMatch = priceHtml.match(/<del[^>]*>[\s\S]*?([0-9][0-9,.\s]*)[\s\S]*?<\/del>/i)

  if (delMatch?.[1]) {
    const numberValue = Number(delMatch[1].replace(/[^0-9.]/g, ''))

    if (Number.isFinite(numberValue) && numberValue > product.price) {
      return numberValue
    }
  }

  return undefined
}

function getProductUrl(product: WooProduct) {
  return `/product/${product.slug || product.id}`
}

function getStockProgress(product: WooProduct) {
  if (product.manageStock && product.stockQuantity !== null) {
    const quantity = safeNumber(product.stockQuantity)
    return Math.max(8, Math.min(100, quantity * 10))
  }

  if (safeNumber(product.totalSales) > 0) {
    return Math.max(20, Math.min(90, safeNumber(product.totalSales) * 10))
  }

  return 55
}

export default function FlashSale({
  products,
  isLoading = false,
  loadError = '',
}: {
  products: WooProduct[]
  isLoading?: boolean
  loadError?: string
}) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [addedToCart, setAddedToCart] = useState<string | null>(null)

  const addItem = useCartStore((state) => state.addItem)
  const navigate = useNavigate()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.flash-banner',
        { x: -100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )

      gsap.fromTo(
        '.flash-product',
        { x: 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.flash-products',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [products.length])

  const displayProducts = useMemo(() => products.slice(0, 12), [products])

  useEffect(() => {
    if (displayProducts.length === 0) return

    void emitMarketplaceEvent({
      eventKey: 'recommendation_impression',
      properties: {
        surface: 'homepage',
        strategy: 'flash-sale',
        item_count: displayProducts.length,
      },
    })
  }, [displayProducts.length])

  const handleAddToCart = (product: WooProduct) => {
    if (product.hasOptions || product.type === 'variable') {
      navigate(getProductUrl(product))
      return
    }

    if (!product.canAddToCart) {
      alert(product.stockLabel || 'This product is currently unavailable.')
      return
    }

    addItem(
      {
        id: Number(product.id),
        name: product.name,
        slug: product.slug,
        price: product.price,
        regular_price: getOriginalPrice(product) || product.price,
        image: product.image,
      },
      1
    )

    setAddedToCart(String(product.id))

    setTimeout(() => {
      setAddedToCart(null)
    }, 2000)
  }

  const formatPrice = (price: number) =>
    `K${safeNumber(price).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  if (isLoading || loadError || displayProducts.length === 0) return null

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden bg-white py-9 lg:py-12"
    >
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flash-banner relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-[#ffb54a] p-4 sm:p-5 lg:p-6">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 animate-pulse">
                <Flame className="h-6 w-6 text-white" />
              </div>

              <div>
                <h2 className="mb-1 font-display text-2xl font-black text-white lg:text-3xl">
                  Flash Sale
                </h2>

                <p className="flex items-center gap-2 text-sm text-white/80">
                  <Clock className="w-4 h-4" />
                  Live marketplace offers
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              Limited-time prices · while stock lasts
            </div>

            <Link to="/collections/deals">
              <Button
                size="lg"
                className="h-10 rounded-full bg-white px-5 text-sm font-bold text-red-500 hover:bg-gray-100"
              >
                Explore deals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flash-products grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {displayProducts.map((product, index) => {
            const originalPrice = getOriginalPrice(product)
            const productUrl = getProductUrl(product)

            return (
                <div
                  key={product.id}
                  className="flash-product group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ffb54a] hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <Link
                      to={productUrl}
                      onClick={() => {
                        void emitMarketplaceEvent({
                          eventKey: 'recommendation_click',
                          properties: {
                            surface: 'homepage',
                            strategy: 'flash-sale',
                            product_id: String(product.id),
                            position: index + 1,
                          },
                        })
                      }}
                    >
                      <img
                        src={getFastProductImage(product, 'card')}
                        srcSet={getFastProductSrcSet(product)}
                        sizes={getProductImageSizes('card')}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onError={(event) => {
                          event.currentTarget.src = '/logo.jpg'
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>

                    <Badge className="absolute top-3 left-3 bg-red-500 text-white font-bold">
                      {product.discoveryBadge || (productHasDeal(product) ? 'Deal' : 'Hot')}
                    </Badge>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-white">
                        <span>{product.stockLabel || 'Available'}</span>
                        {product.manageStock && product.stockQuantity !== null && (
                          <span className="font-semibold">
                            {product.stockQuantity} left
                          </span>
                        )}
                      </div>

                      <Progress
                        value={getStockProgress(product)}
                        className="h-2 bg-white/30"
                      />
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5">
                    <Link
                      to={productUrl}
                      onClick={() => {
                        void emitMarketplaceEvent({
                          eventKey: 'recommendation_click',
                          properties: {
                            surface: 'homepage',
                            strategy: 'flash-sale',
                            product_id: String(product.id),
                            position: index + 1,
                          },
                        })
                      }}
                    >
                      <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5 text-black transition-colors hover:text-[#ffb54a]">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-black text-red-500 sm:text-lg">
                        {formatPrice(product.price)}
                      </span>

                      {originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      className={`h-9 w-full rounded-full text-xs font-black transition-all ${
                        addedToCart === String(product.id)
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                      } text-white`}
                      size="sm"
                    >
                      {addedToCart === String(product.id) ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Added
                        </>
                      ) : product.hasOptions || product.type === 'variable' ? (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Choose options
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

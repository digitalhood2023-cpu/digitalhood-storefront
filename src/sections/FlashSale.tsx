import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Clock, Flame, Check, ArrowRight, Loader2 } from 'lucide-react'

import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import {
  fetchWooProducts,
  type WooProduct,
} from '@/lib/woocommerce'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function productHasDeal(product: WooProduct) {
  const priceHtml = String(product.priceHtml || '').toLowerCase()
  const stockLabel = String(product.stockLabel || '').toLowerCase()

  return (
    priceHtml.includes('del') ||
    priceHtml.includes('ins') ||
    priceHtml.includes('sale') ||
    stockLabel.includes('sale') ||
    stockLabel.includes('deal') ||
    stockLabel.includes('left')
  )
}

function getOriginalPrice(product: WooProduct) {
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

export default function FlashSale() {
  const sectionRef = useRef<HTMLDivElement>(null)

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 2,
    hours: 14,
    minutes: 35,
    seconds: 42,
  })

  const [products, setProducts] = useState<WooProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [addedToCart, setAddedToCart] = useState<string | null>(null)

  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev

        if (seconds > 0) {
          seconds--
        } else {
          seconds = 59

          if (minutes > 0) {
            minutes--
          } else {
            minutes = 59

            if (hours > 0) {
              hours--
            } else {
              hours = 23

              if (days > 0) {
                days--
              }
            }
          }
        }

        return { days, hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadFlashProducts() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetchWooProducts(24, 1)
        const availableProducts = (response.products || []).filter(
          (product) => product.price > 0
        )

        const dealProducts = availableProducts.filter(productHasDeal)

        const selectedProducts =
          dealProducts.length > 0
            ? dealProducts.slice(0, 4)
            : availableProducts
                .sort((a, b) => safeNumber(b.totalSales) - safeNumber(a.totalSales))
                .slice(0, 4)

        if (mounted) {
          setProducts(selectedProducts)
        }
      } catch (error) {
        console.error(error)

        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'We could not load flash sale products right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadFlashProducts()

    return () => {
      mounted = false
    }
  }, [])

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
        '.countdown-box',
        { rotateX: -90, opacity: 0 },
        {
          rotateX: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
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

  const displayProducts = useMemo(() => products.slice(0, 4), [products])

  const handleAddToCart = (product: WooProduct) => {
    if (product.hasOptions || product.type === 'variable') {
      window.location.href = getProductUrl(product)
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

  const formatTime = (value: number) => value.toString().padStart(2, '0')

  return (
    <section
      ref={sectionRef}
      className="py-16 lg:py-24 bg-white overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flash-banner relative bg-gradient-to-r from-red-500 via-orange-500 to-[#ffb54a] rounded-3xl p-6 lg:p-10 mb-10 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                <Flame className="w-7 h-7 text-white" />
              </div>

              <div>
                <h2 className="font-display font-bold text-2xl lg:text-4xl text-white mb-1">
                  Flash Sale
                </h2>

                <p className="text-white/80 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Live marketplace offers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {[
                { value: timeLeft.days, label: 'Days' },
                { value: timeLeft.hours, label: 'Hours' },
                { value: timeLeft.minutes, label: 'Mins' },
                { value: timeLeft.seconds, label: 'Secs' },
              ].map((item, index) => (
                <div key={index} className="countdown-box text-center">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-xl flex items-center justify-center mb-1">
                    <span className="font-display font-bold text-xl lg:text-2xl text-red-500">
                      {formatTime(item.value)}
                    </span>
                  </div>

                  <span className="text-xs text-white/80">{item.label}</span>
                </div>
              ))}
            </div>

            <Link to="/shop">
              <Button
                size="lg"
                className="bg-white text-red-500 hover:bg-gray-100 rounded-full px-8 font-semibold"
              >
                Explore deals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl bg-dh-gray p-10 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-dh-primary" />
            <p className="font-semibold text-dh-primary">
              Loading live deals...
            </p>
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-yellow-800">
            <p className="font-semibold">Flash sale products could not load.</p>
            <p className="mt-1 text-sm">{loadError}</p>
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="flash-products grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {displayProducts.map((product) => {
              const originalPrice = getOriginalPrice(product)
              const productUrl = getProductUrl(product)

              return (
                <div
                  key={product.id}
                  className="flash-product group bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-[#ffb54a] transition-all duration-300 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <Link to={productUrl}>
                      <img
                        src={product.image || '/logo.jpg'}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = '/logo.jpg'
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>

                    <Badge className="absolute top-3 left-3 bg-red-500 text-white font-bold">
                      {productHasDeal(product) ? 'Deal' : 'Hot'}
                    </Badge>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center justify-between text-white text-sm mb-1">
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

                  <div className="p-4">
                    <Link to={productUrl}>
                      <h3 className="font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2 text-sm">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-display font-bold text-lg text-red-500">
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
                      className={`w-full rounded-xl transition-all ${
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
        ) : (
          <div className="rounded-3xl bg-dh-gray p-8 text-center">
            <h3 className="font-display text-xl font-bold text-dh-primary">
              Deals are being prepared
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
              Live marketplace offers will appear here once available.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CreditCard,
  PackageCheck,
  Shield,
  ShoppingBag,
  Star,
  Truck,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

import {
  fetchWooProducts,
  type WooProduct,
} from '@/lib/woocommerce'

import gsap from 'gsap'
import { getFastProductImage, getFastProductSrcSet, getProductImageSizes } from '@/lib/productImages'

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function formatPrice(price: number) {
  return `K${safeNumber(price).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product?: WooProduct | null) {
  if (!product) return '/shop'

  return `/product/${product.slug || product.id}`
}

function getDealProducts(products: WooProduct[]) {
  return products.filter((product) => {
    const priceHtml = String(product.priceHtml || '').toLowerCase()
    const stockLabel = String(product.stockLabel || '').toLowerCase()

    return (
      priceHtml.includes('del') ||
      priceHtml.includes('sale') ||
      stockLabel.includes('sale') ||
      stockLabel.includes('deal')
    )
  })
}

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<WooProduct[]>([])

  useEffect(() => {
    let mounted = true

    async function loadHeroProducts() {
      try {
        const response = await fetchWooProducts(12, 1)

        if (!mounted) return

        setProducts((response.products || []).filter((product) => product.price > 0))
      } catch (error) {
        console.error(error)
      }
    }

    loadHeroProducts()

    return () => {
      mounted = false
    }
  }, [])

  const heroData = useMemo(() => {
    const availableProducts = products.filter((product) => product.price > 0)

    const newestProducts = [...availableProducts]
      .sort((a, b) => safeNumber(b.id) - safeNumber(a.id))

    const bestSellerProducts = [...availableProducts]
      .sort((a, b) => safeNumber(b.totalSales) - safeNumber(a.totalSales))

    const dealProducts = getDealProducts(availableProducts)

    const featuredProduct =
      dealProducts[0] ||
      bestSellerProducts[0] ||
      newestProducts[0] ||
      availableProducts[0] ||
      null

    const previewProducts = [
      featuredProduct,
      newestProducts.find((product) => product.id !== featuredProduct?.id),
      bestSellerProducts.find((product) => product.id !== featuredProduct?.id),
    ].filter(Boolean) as WooProduct[]

    return {
      featuredProduct,
      previewProducts,
      productCount: availableProducts.length,
      dealCount: dealProducts.length,
      newArrivalCount: newestProducts.length,
      bestSeller:
        bestSellerProducts.find((product) => safeNumber(product.totalSales) > 0) ||
        bestSellerProducts[0] ||
        null,
    }
  }, [products])

  const featuredImage =
    heroData.featuredProduct?.image ||
    heroData.featuredProduct?.images?.[0] ||
    '/logo.jpg'

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-line',
        { y: 40, opacity: 0, clipPath: 'inset(100% 0 0 0)' },
        {
          y: 0,
          opacity: 1,
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.8,
          stagger: 0.15,
          ease: 'expo.out',
          delay: 0.3,
        }
      )

      gsap.fromTo(
        '.hero-subheadline',
        { y: 20, opacity: 0, filter: 'blur(10px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.9,
        }
      )

      gsap.fromTo(
        '.hero-cta',
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.7)',
          delay: 1.1,
        }
      )

      gsap.fromTo(
        imageRef.current,
        { opacity: 0, rotateY: 15, z: -100 },
        {
          opacity: 1,
          rotateY: 0,
          z: 0,
          duration: 1,
          ease: 'expo.out',
          delay: 0.5,
        }
      )

      gsap.fromTo(
        '.trust-item',
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.15,
          ease: 'back.out(1.7)',
          delay: 1.4,
        }
      )

      gsap.to('.orb-1', {
        x: 30,
        y: -20,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.orb-2', {
        x: -20,
        y: 30,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      })

      gsap.to('.orb-3', {
        x: 15,
        y: -15,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 4,
      })

      gsap.to(imageRef.current, {
        y: -8,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-[#ffb54a]/10"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute left-10 top-20 h-64 w-64 rounded-full bg-black/5 blur-3xl" />
        <div className="orb-2 absolute bottom-20 right-20 h-80 w-80 rounded-full bg-[#ffb54a]/20 blur-3xl" />
        <div className="orb-3 absolute left-1/3 top-1/2 h-48 w-48 rounded-full bg-black/5 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12 xl:px-12">
        <div className="grid items-center gap-8 lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)] lg:gap-10">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-white">
              <Zap className="h-4 w-4 text-[#ffb54a]" />
              <span className="text-sm font-medium tracking-wide">
                FIXING TOMORROW TODAY
              </span>
            </div>

            <div ref={headlineRef} className="mb-4">
              <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl lg:text-6xl xl:text-[4.35rem]">
                <span className="hero-line block text-black">Premium Tech</span>
                <span className="hero-line block text-black">For Zambia</span>
                <span className="hero-line block text-[#ffb54a]">Delivered</span>
              </h1>
            </div>

            <p className="hero-subheadline mx-auto mb-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg lg:mx-0">
              Shop real products from the DigitalHood marketplace. Discover
              phones, accessories, gadgets, and everyday tech with secure
              checkout and delivery across Zambia.
            </p>

            <div className="mb-6 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/shop" className="hero-cta">
                <Button
                  size="lg"
                  className="group h-12 rounded-full bg-black px-6 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#ffb54a] hover:text-black hover:shadow-xl"
                >
                  Shop marketplace
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/shop?sort=newest" className="hero-cta">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-2 border-black px-6 text-base font-bold text-black transition-all hover:bg-black hover:text-white"
                >
                  New arrivals
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-2 lg:justify-start lg:gap-3">
              <div className="trust-item flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffb54a]/20">
                  <Truck className="h-4 w-4 text-black" />
                </div>
                <span>Zambia delivery</span>
              </div>

              <div className="trust-item flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffb54a]/20">
                  <Shield className="h-4 w-4 text-black" />
                </div>
                <span>Verified checkout</span>
              </div>

              <div className="trust-item flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffb54a]/20">
                  <CreditCard className="h-4 w-4 text-black" />
                </div>
                <span>Card & mobile money</span>
              </div>
            </div>
          </div>

          <div
            className="order-1 flex justify-center lg:order-2 lg:justify-end"
            style={{ perspective: '1000px' }}
          >
            <div
              ref={imageRef}
              className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Link to={getProductUrl(heroData.featuredProduct)} className="relative z-10 block">
                <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-xl">
                  <img
                    src={featuredImage}
                    alt={heroData.featuredProduct?.name || 'DigitalHood marketplace product'}
                    onError={(event) => {
                      event.currentTarget.src = '/logo.jpg'
                    }}
                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                  />

                  <div className="mt-3 rounded-2xl bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Featured product
                        </p>
                        <p className="mt-1 line-clamp-1 font-display text-lg font-bold text-black">
                          {heroData.featuredProduct?.name || 'DigitalHood Marketplace'}
                        </p>
                      </div>

                      {heroData.featuredProduct && (
                        <p className="shrink-0 rounded-full bg-[#ffb54a]/20 px-3 py-1 text-sm font-bold text-black">
                          {formatPrice(heroData.featuredProduct.price)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to="/shop?sort=newest"
                className="absolute -left-4 top-1/4 z-20 rounded-2xl bg-white p-3 shadow-lg transition-transform hover:-translate-y-1 lg:-left-8 lg:p-4"
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb54a]/20 lg:h-12 lg:w-12">
                    <ShoppingBag className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black lg:text-base">
                      New arrivals
                    </p>
                    <p className="text-xs text-gray-500">
                      {heroData.newArrivalCount
                        ? `${heroData.newArrivalCount} live products`
                        : 'Live store'}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/shop"
                className="absolute -right-2 bottom-1/4 z-20 rounded-2xl bg-white p-3 shadow-lg transition-transform hover:-translate-y-1 lg:-right-4 lg:p-4"
                style={{ animationDelay: '1s' }}
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 lg:h-12 lg:w-12">
                    <PackageCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-600 lg:text-base">
                      Verified
                    </p>
                    <p className="text-xs text-gray-500">
                      Real store products
                    </p>
                  </div>
                </div>
              </Link>

              {heroData.previewProducts.length > 0 && (
                <div className="absolute -bottom-5 left-4 right-4 z-20 hidden rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur md:block">
                  <div className="grid grid-cols-3 gap-2">
                    {heroData.previewProducts.slice(0, 3).map((product) => (
                      <Link
                        key={product.id}
                        to={getProductUrl(product)}
                        className="group rounded-2xl p-2 transition-colors hover:bg-gray-50"
                      >
                        <img
                          src={getFastProductImage(product, 'thumb')}
                          srcSet={getFastProductSrcSet(product)}
                          sizes={getProductImageSizes('search')}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                          className="mb-2 aspect-square w-full rounded-xl object-cover"
                        />
                        <p className="line-clamp-1 text-xs font-semibold text-black group-hover:text-[#ffb54a]">
                          {product.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                          <Star className="h-3 w-3 fill-[#ffb54a] text-[#ffb54a]" />
                          {safeNumber(product.averageRating).toFixed(1)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-3xl bg-black/5 lg:-bottom-6 lg:-right-6" />
              <div className="absolute -bottom-8 -right-8 -z-20 h-full w-full rounded-3xl bg-[#ffb54a]/10 lg:-bottom-12 lg:-right-12" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  )
}

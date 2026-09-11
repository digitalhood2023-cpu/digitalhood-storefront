import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Search,
  Sparkles,
  Store,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  advanceProductImageFallback,
  getFastProductImage,
  getFastProductSrcSet,
  getProductImageSizes,
} from '@/lib/productImages'
import type { WooProduct } from '@/lib/woocommerce'

const QUICK_LINKS = [
  { label: 'Phones', to: '/search?q=phones' },
  { label: 'Laptops', to: '/search?q=laptops' },
  { label: 'Accessories', to: '/search?q=accessories' },
  { label: 'Gaming', to: '/search?q=gaming' },
]

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
  return product ? `/product/${product.slug || product.id}` : '/shop'
}

function getSellerName(product?: WooProduct | null) {
  return (
    product?.sellerStoreName ||
    product?.seller?.storeName ||
    'DigitalHood Marketplace'
  )
}

function productScore(product: WooProduct) {
  return (
    safeNumber(product.totalSales) * 5 +
    safeNumber(product.averageRating) * 20 +
    safeNumber(product.ratingCount) * 2 +
    safeNumber(product.id) / 100000
  )
}

export default function Hero({ products = [] }: { products?: WooProduct[] }) {
  const marketplacePicks = useMemo(() => {
    return products
      .filter((product) => product.id && safeNumber(product.price) > 0)
      .slice()
      .sort((left, right) => productScore(right) - productScore(left))
      .slice(0, 3)
  }, [products])

  const featuredProduct = marketplacePicks[0] || null
  const supportingProducts = marketplacePicks.slice(1)

  return (
    <section className="dh-home-hero relative isolate overflow-hidden border-y">
      <div
        className="dh-home-hero-grid pointer-events-none absolute inset-0 -z-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black, transparent 88%)',
        }}
      />
      <div
        className="dh-home-hero-glow pointer-events-none absolute -right-24 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="dh-home-hero-glow-secondary pointer-events-none absolute -bottom-44 left-1/4 -z-10 h-[24rem] w-[24rem] rounded-full blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-12">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(500px,1.12fr)] lg:gap-9">
          <div className="max-w-[38rem]">
            <div className="dh-home-hero-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Zambia&apos;s tech marketplace
            </div>

            <h1 className="dh-home-hero-title font-display text-[2.3rem] font-black leading-[0.98] tracking-[-0.04em] sm:text-[2.9rem] lg:text-[3.35rem]">
              Better tech.
              <span className="dh-home-hero-title-accent mt-0.5 block">More choice.</span>
              <span className="mt-1 block">One marketplace.</span>
            </h1>

            <p className="dh-home-hero-copy mt-4 max-w-xl text-sm font-medium leading-6 sm:text-base sm:leading-7">
              Discover products from trusted Zambian stores, compare your
              options, pay securely and arrange delivery without leaving the
              marketplace.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex">
              <Link to="/shop" className="min-w-0">
                <Button className="group h-10 w-full rounded-full bg-[#ffb54a] px-4 text-sm font-black text-[#07111f] shadow-[0_12px_30px_rgba(255,181,74,.2)] hover:bg-[#ffd18e] sm:w-auto sm:px-5">
                  Explore marketplace
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/shops" className="min-w-0">
                <Button
                  variant="outline"
                  className="dh-home-hero-secondary h-10 w-full rounded-full border px-4 text-sm font-black sm:w-auto sm:px-5"
                >
                  <Store className="mr-1 h-4 w-4" />
                  Browse stores
                </Button>
              </Link>
            </div>

            <nav aria-label="Popular product searches" className="mt-5">
              <div className="dh-home-hero-muted mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                <Search className="h-3.5 w-3.5" />
                Popular right now
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="dh-home-hero-chip rounded-full border px-3 py-1.5 text-xs font-bold transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div className="dh-home-hero-showcase rounded-[1.6rem] border p-2.5 backdrop-blur-xl sm:p-3">
              <div className="mb-2.5 flex items-center justify-between px-1 sm:px-1.5">
                <div>
                  <p className="dh-home-hero-eyebrow-text text-[10px] font-black uppercase tracking-[0.16em]">
                    Curated today
                  </p>
                  <h2 className="dh-home-hero-title mt-0.5 font-display text-base font-black sm:text-lg">
                    Marketplace picks
                  </h2>
                </div>

                <Link
                  to="/collections/trending"
                  className="dh-home-hero-link inline-flex items-center gap-1 text-xs font-bold transition"
                >
                  See trending
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {featuredProduct ? (
                <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.6fr)]">
                  <Link
                    to={getProductUrl(featuredProduct)}
                    className="group relative min-h-[260px] overflow-hidden rounded-[1.25rem] bg-white text-[#07111f] sm:min-h-[315px]"
                  >
                    <img
                      src={getFastProductImage(featuredProduct, 'large')}
                      srcSet={getFastProductSrcSet(featuredProduct)}
                      sizes={getProductImageSizes('detail')}
                      alt={featuredProduct.name}
                      fetchPriority="high"
                      decoding="async"
                      onError={(event) =>
                        advanceProductImageFallback(
                          event.currentTarget,
                          featuredProduct,
                          'large'
                        )
                      }
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035] motion-reduce:transition-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-[#07111f]/10 to-transparent" />

                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#07111f] shadow-lg">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Featured find
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <p className="mb-1.5 text-[11px] font-bold text-[#ffd18e]">
                        {getSellerName(featuredProduct)}
                      </p>
                      <h3 className="line-clamp-2 font-display text-lg font-black leading-tight text-white sm:text-xl">
                        {featuredProduct.name}
                      </h3>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="font-display text-lg font-black text-white sm:text-xl">
                          {formatPrice(featuredProduct.price)}
                        </span>
                        <span className="inline-flex h-8 items-center rounded-full bg-[#ffb54a] px-3 text-xs font-black text-[#07111f]">
                          View product
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-1">
                    {supportingProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={getProductUrl(product)}
                        className="group min-w-0 overflow-hidden rounded-[1.15rem] bg-white p-2 text-[#07111f] transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none"
                      >
                        <div className="h-20 overflow-hidden rounded-[0.85rem] bg-slate-100 sm:h-[88px]">
                          <img
                            src={getFastProductImage(product, 'card')}
                            srcSet={getFastProductSrcSet(product)}
                            sizes={getProductImageSizes('card')}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            onError={(event) =>
                              advanceProductImageFallback(
                                event.currentTarget,
                                product,
                                'card'
                              )
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none"
                          />
                        </div>
                        <div className="px-0.5 pb-0.5 pt-2">
                          <p className="line-clamp-2 min-h-8 text-[11px] font-black leading-4 sm:text-xs">
                            {product.name}
                          </p>
                          <p className="mt-1.5 text-xs font-black text-[#9a5b00] sm:text-sm">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="dh-home-hero-empty flex min-h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed p-6 text-center sm:min-h-[315px]">
                  <div className="max-w-sm">
                    <Store className="mx-auto h-10 w-10 text-[#d68100]" />
                    <h3 className="dh-home-hero-title mt-3 font-display text-xl font-black">
                      Find your next everyday upgrade
                    </h3>
                    <p className="dh-home-hero-copy mt-2 text-sm leading-6">
                      Browse phones, computers, accessories and useful tech from
                      marketplace stores across Zambia.
                    </p>
                    <Link
                      to="/shop"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ffb54a] px-4 py-2 text-sm font-black text-[#07111f]"
                    >
                      Start exploring
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

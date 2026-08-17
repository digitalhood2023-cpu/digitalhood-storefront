import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
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
    <section className="relative isolate overflow-hidden bg-[#07111f] text-white">
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'linear-gradient(to bottom, black, transparent 88%)',
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-32 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#ffb54a]/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-44 left-1/4 -z-10 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14 xl:px-12">
        <div className="grid items-center gap-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(500px,1.1fr)] lg:gap-14">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#ffd18e] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Zambia&apos;s tech marketplace
            </div>

            <h1 className="font-display text-[2.7rem] font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.7rem]">
              Better tech.
              <span className="mt-1 block text-[#ffb54a]">More choice.</span>
              <span className="mt-1 block">One marketplace.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-300 sm:text-lg">
              Discover products from trusted Zambian stores, compare your
              options, pay securely and arrange delivery without leaving the
              marketplace.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/shop">
                <Button className="group h-12 w-full rounded-full bg-[#ffb54a] px-6 text-base font-black text-[#07111f] shadow-[0_16px_40px_rgba(255,181,74,.24)] hover:bg-[#ffd18e] sm:w-auto">
                  Explore marketplace
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/shops">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/25 bg-white/5 px-6 text-base font-black text-white hover:border-white/50 hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <Store className="mr-2 h-5 w-5" />
                  Browse stores
                </Button>
              </Link>
            </div>

            <nav aria-label="Popular product searches" className="mt-7">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                <Search className="h-3.5 w-3.5" />
                Popular right now
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-[#ffb54a]/60 hover:bg-[#ffb54a]/10 hover:text-[#ffd18e]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-3 shadow-[0_32px_90px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1 sm:px-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ffd18e]">
                    Curated today
                  </p>
                  <h2 className="mt-1 font-display text-lg font-black text-white sm:text-xl">
                    Marketplace picks
                  </h2>
                </div>

                <Link
                  to="/collections/trending"
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 transition hover:text-[#ffd18e] sm:text-sm"
                >
                  See trending
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {featuredProduct ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(190px,0.65fr)]">
                  <Link
                    to={getProductUrl(featuredProduct)}
                    className="group relative min-h-[330px] overflow-hidden rounded-[1.55rem] bg-white text-[#07111f] sm:min-h-[440px]"
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

                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#07111f] shadow-lg">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Featured find
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <p className="mb-2 text-xs font-bold text-[#ffd18e]">
                        {getSellerName(featuredProduct)}
                      </p>
                      <h3 className="line-clamp-2 font-display text-xl font-black leading-tight text-white sm:text-2xl">
                        {featuredProduct.name}
                      </h3>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="font-display text-xl font-black text-white sm:text-2xl">
                          {formatPrice(featuredProduct.price)}
                        </span>
                        <span className="inline-flex h-10 items-center rounded-full bg-[#ffb54a] px-4 text-sm font-black text-[#07111f]">
                          View product
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                    {supportingProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={getProductUrl(product)}
                        className="group overflow-hidden rounded-[1.4rem] bg-white p-2.5 text-[#07111f] transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none"
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-slate-100">
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
                        <div className="px-1 pb-1 pt-2.5">
                          <p className="line-clamp-2 min-h-9 text-xs font-black leading-[1.15rem] sm:text-sm">
                            {product.name}
                          </p>
                          <p className="mt-2 text-sm font-black text-[#9a5b00] sm:text-base">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[360px] items-center justify-center rounded-[1.55rem] border border-dashed border-white/20 bg-white/[0.05] p-8 text-center sm:min-h-[440px]">
                  <div className="max-w-sm">
                    <Store className="mx-auto h-12 w-12 text-[#ffb54a]" />
                    <h3 className="mt-4 font-display text-2xl font-black">
                      Find your next everyday upgrade
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Browse phones, computers, accessories and useful tech from
                      marketplace stores across Zambia.
                    </p>
                    <Link
                      to="/shop"
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#07111f]"
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

        <div className="mt-9 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Secure marketplace checkout',
              text: 'Protected payment flow',
            },
            {
              icon: CreditCard,
              title: 'Pay your way',
              text: 'Cards and mobile money',
            },
            {
              icon: Truck,
              title: 'Delivery across Zambia',
              text: 'Clear delivery details',
            },
          ].map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${
                  index > 0 ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb54a]/15 text-[#ffd18e]">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-white">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                    {index === 2 && <MapPin className="h-3 w-3" />}
                    {item.text}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

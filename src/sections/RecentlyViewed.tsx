import { ArrowRight, Clock3, Star, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useRecentlyViewed } from '@/context/RecentlyViewedContext'
import {
  advanceProductImageFallback,
  getFastProductImage,
  getFastProductSrcSet,
  getProductImageSizes,
} from '@/lib/productImages'

function formatPrice(price: number) {
  return `K${Number(price || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: { id: string | number; slug?: string }) {
  return `/product/${product.slug || product.id}`
}

export default function RecentlyViewed({
  excludeProductId,
}: {
  excludeProductId?: string | number
}) {
  const { items, hasItems, removeRecentlyViewed } = useRecentlyViewed()
  const visibleItems = items.filter(
    (item) => String(item.id) !== String(excludeProductId || '')
  )

  if (!hasItems || visibleItems.length === 0) return null

  return (
    <section className="dh-recently-viewed border-y border-gray-100 bg-white py-4 sm:py-5">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffb54a]/20 text-[#9a5a00]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-black leading-tight text-black sm:text-xl">
                Recently viewed
              </h2>
              <p className="truncate text-xs font-medium text-gray-500">
                Continue where you left off
              </p>
            </div>
          </div>

          <Link
            to="/recently-viewed"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-black text-black transition hover:border-[#ffb54a] hover:bg-[#fff7e8]"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-1 sm:px-1">
          <div className="flex gap-3">
            {visibleItems.slice(0, 12).map((product) => (
              <article
                key={product.id}
                className="group relative w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#ffb54a]/60 hover:shadow-md sm:w-[178px]"
              >
                <button
                  type="button"
                  onClick={() => removeRecentlyViewed(product.id)}
                  className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/60 bg-black/65 text-white backdrop-blur transition hover:bg-red-600"
                  aria-label={`Remove ${product.name} from recently viewed`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <Link to={getProductUrl(product)} className="block">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={getFastProductImage(product, 'card')}
                      srcSet={getFastProductSrcSet(product)}
                      sizes={getProductImageSizes('card')}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      onError={(event) => {
                        advanceProductImageFallback(event.currentTarget, product, 'card')
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-2.5 sm:p-3">
                    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-gray-500">
                      {Number(product.rating || 0) > 0 ? (
                        <>
                          <Star className="h-3 w-3 fill-[#ffb54a] text-[#ffb54a]" />
                          <span>{Number(product.rating).toFixed(1)}</span>
                          <span className="text-gray-400">({Number(product.reviews || 0)})</span>
                        </>
                      ) : (
                        <span className="truncate">{product.category || 'Marketplace'}</span>
                      )}
                    </div>

                    <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.15rem] text-black transition-colors group-hover:text-[#9a5a00] sm:text-[13px]">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate font-display text-sm font-black text-black sm:text-[15px]">
                        {formatPrice(product.price)}
                      </p>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-white transition group-hover:bg-[#ffb54a] group-hover:text-black">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { Eye, X } from 'lucide-react'

import { useRecentlyViewed } from '@/context/RecentlyViewedContext'

function formatPrice(price: number) {
  return `K${Number(price || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: { id: string | number; slug?: string }) {
  return `/product/${product.slug || product.id}`
}

export default function RecentlyViewed() {
  const { items, hasItems, removeRecentlyViewed } = useRecentlyViewed()

  if (!hasItems) return null

  return (
    <section className="bg-white py-8 lg:py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dh-primary">
              <Eye className="h-3.5 w-3.5" />
              Continue shopping
            </p>

            <h2 className="font-display text-2xl font-bold text-dh-primary">
              Recently viewed
            </h2>
          </div>

          <Link
            to="/recently-viewed"
            className="rounded-full border border-dh-primary px-4 py-2 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
          >
            View all
          </Link>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-4">
            {items.slice(0, 10).map((product) => (
              <article
                key={product.id}
                className="group relative w-40 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-dh-light-gray transition-all hover:-translate-y-1 hover:shadow-lg sm:w-44"
              >
                <button
                  type="button"
                  onClick={() => removeRecentlyViewed(product.id)}
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-dh-primary shadow-sm transition-colors hover:bg-red-500 hover:text-white"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="h-4 w-4" />
                </button>

                <Link to={getProductUrl(product)}>
                  <div className="aspect-square bg-dh-gray">
                    <img
                      src={product.image || '/logo.jpg'}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.src = '/logo.jpg'
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-3">
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-dh-primary group-hover:text-dh-secondary">
                      {product.name}
                    </h3>

                    <p className="mt-2 font-display text-sm font-bold text-dh-primary">
                      {formatPrice(product.price)}
                    </p>
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

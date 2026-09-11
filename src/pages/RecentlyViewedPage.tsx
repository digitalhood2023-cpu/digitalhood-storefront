import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Grid3X3,
  List,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import SEO from '@/components/SEO'
import { useRecentlyViewed } from '@/context/RecentlyViewedContext'
import {
  advanceProductImageFallback,
  getFastProductImage,
  getFastProductSrcSet,
  getProductImageSizes,
} from '@/lib/productImages'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

function formatPrice(price: number) {
  return `K${Number(price || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: { id: string | number; slug?: string }) {
  return `/product/${product.slug || product.id}`
}

export default function RecentlyViewedPage() {
  const {
    items,
    hasItems,
    removeRecentlyViewed,
    removeSelectedRecentlyViewed,
    clearRecentlyViewed,
  } = useRecentlyViewed()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items.length, selectedIds.length]
  )

  const toggleSelected = (productId: string | number) => {
    const id = String(productId)
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const removeOne = (productId: string | number) => {
    removeRecentlyViewed(productId)
    setSelectedIds((current) =>
      current.filter((item) => item !== String(productId))
    )
  }

  const deleteSelected = () => {
    if (selectedIds.length === 0) return
    removeSelectedRecentlyViewed(selectedIds)
    setSelectedIds([])
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-gray-50">
      <SEO
        title="Recently Viewed | DigitalHood Marketplace"
        description="Review products you recently viewed on DigitalHood Marketplace."
        path="/recently-viewed"
      />
      <Header />

      <main className="py-3 sm:py-4">
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-6 lg:px-8 xl:px-12">
          <section className="mb-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Link
                  to="/"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-black transition hover:border-[#ffb54a] hover:bg-[#fff7e8]"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffb54a]/20 text-[#9a5a00]">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h1 className="font-display text-lg font-black leading-tight text-black sm:text-xl">
                    Recently viewed
                  </h1>
                  <p className="text-xs font-semibold text-gray-500">
                    {items.length} product{items.length === 1 ? '' : 's'} in your history
                  </p>
                </div>
              </div>

              {hasItems && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <div className="flex h-9 overflow-hidden rounded-full border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`grid w-9 place-items-center transition ${
                        viewMode === 'grid'
                          ? 'bg-black text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                      }`}
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`grid w-9 place-items-center transition ${
                        viewMode === 'list'
                          ? 'bg-black text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                      }`}
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedIds(allSelected ? [] : items.map((item) => String(item.id)))}
                    className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-black text-black transition hover:border-[#ffb54a]"
                  >
                    {allSelected ? 'Unselect all' : 'Select all'}
                  </button>

                  {selectedIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={deleteSelected}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-3 text-xs font-black text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove {selectedIds.length}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={clearRecentlyViewed}
                      className="h-9 rounded-full px-3 text-xs font-black text-red-600 transition hover:bg-red-50"
                    >
                      Clear history
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {!hasItems ? (
            <section className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center shadow-sm">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#ffb54a]/20 text-[#9a5a00]">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-display text-xl font-black text-black">
                Nothing viewed yet
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                Products you open will appear here for quick access.
              </p>
              <Link
                to="/shop"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white transition hover:bg-[#ffb54a] hover:text-black"
              >
                Explore marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : viewMode === 'grid' ? (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((product) => {
                const selected = selectedIds.includes(String(product.id))
                return (
                  <article
                    key={product.id}
                    className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                      selected ? 'border-[#ffb54a] ring-2 ring-[#ffb54a]/25' : 'border-gray-100'
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <Link to={getProductUrl(product)} className="block h-full">
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
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSelected(product.id)}
                        className={`absolute left-1.5 top-1.5 grid h-7 min-w-7 place-items-center rounded-full border px-1.5 text-[10px] font-black backdrop-blur ${
                          selected
                            ? 'border-[#ffb54a] bg-[#ffb54a] text-black'
                            : 'border-white/60 bg-black/65 text-white'
                        }`}
                        aria-label={`${selected ? 'Unselect' : 'Select'} ${product.name}`}
                        aria-pressed={selected}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : 'Select'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOne(product.id)}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/60 bg-black/65 text-white backdrop-blur transition hover:bg-red-600"
                        aria-label={`Remove ${product.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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
                      <Link to={getProductUrl(product)}>
                        <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.15rem] text-black transition hover:text-[#9a5a00] sm:text-[13px]">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="truncate font-display text-sm font-black text-black sm:text-base">
                          {formatPrice(product.price)}
                        </p>
                        <Link
                          to={getProductUrl(product)}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-white transition hover:bg-[#ffb54a] hover:text-black"
                          aria-label={`View ${product.name}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          ) : (
            <section className="grid gap-2">
              {items.map((product) => {
                const selected = selectedIds.includes(String(product.id))
                return (
                  <article
                    key={product.id}
                    className={`grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-white p-2 shadow-sm sm:grid-cols-[92px_minmax(0,1fr)_auto] ${
                      selected ? 'border-[#ffb54a] ring-2 ring-[#ffb54a]/25' : 'border-gray-100'
                    }`}
                  >
                    <Link to={getProductUrl(product)} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={getFastProductImage(product, 'card')}
                        srcSet={getFastProductSrcSet(product)}
                        sizes="92px"
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          advanceProductImageFallback(event.currentTarget, product, 'card')
                        }}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link to={getProductUrl(product)}>
                        <h3 className="line-clamp-2 text-xs font-bold text-black hover:text-[#9a5a00] sm:text-sm">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="mt-1 font-display text-sm font-black text-black sm:text-base">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSelected(product.id)}
                        className={`grid h-8 w-8 place-items-center rounded-full border ${
                          selected
                            ? 'border-[#ffb54a] bg-[#ffb54a] text-black'
                            : 'border-gray-200 text-gray-500 hover:text-black'
                        }`}
                        aria-label={`${selected ? 'Unselect' : 'Select'} ${product.name}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOne(product.id)}
                        className="grid h-8 w-8 place-items-center rounded-full text-red-600 transition hover:bg-red-50"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

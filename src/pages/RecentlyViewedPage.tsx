import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, ShoppingBag, Trash2, X } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Button } from '@/components/ui/button'
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

export default function RecentlyViewedPage() {
  const {
    items,
    hasItems,
    removeRecentlyViewed,
    removeSelectedRecentlyViewed,
    clearRecentlyViewed,
  } = useRecentlyViewed()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedCount = selectedIds.length

  const allSelected = useMemo(() => {
    return items.length > 0 && selectedIds.length === items.length
  }, [items.length, selectedIds.length])

  const toggleSelected = (productId: string | number) => {
    const id = String(productId)

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => String(item.id)))
  }

  const deleteSelected = () => {
    if (selectedIds.length === 0) return

    removeSelectedRecentlyViewed(selectedIds)
    setSelectedIds([])
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <SEO
        title="Recently Viewed | DigitalHood Marketplace"
        description="Review products you recently viewed on DigitalHood Marketplace."
        path="/recently-viewed"
      />

      <Header />

      <main className="py-6 lg:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <Eye className="h-4 w-4" />
                  Recently viewed
                </p>

                <h1 className="font-display text-3xl font-bold text-dh-primary">
                  Pick up where you left off
                </h1>

                <p className="mt-2 text-sm text-dh-dark-gray">
                  We keep up to 50 recently viewed products for a smoother shopping experience.
                </p>
              </div>

              {hasItems && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleSelectAll}
                    className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                  >
                    {allSelected ? 'Unselect all' : 'Select all'}
                  </Button>

                  {selectedCount > 0 && (
                    <Button
                      type="button"
                      onClick={deleteSelected}
                      className="rounded-full bg-red-600 text-white hover:bg-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete selected ({selectedCount})
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearRecentlyViewed}
                    className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </section>

          {!hasItems ? (
            <section className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-dh-primary" />

              <h2 className="font-display text-2xl font-bold text-dh-primary">
                No recently viewed products yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
                Browse the marketplace and products you open will appear here.
              </p>

              <Link to="/shop">
                <Button className="mt-6 rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                  Start shopping
                </Button>
              </Link>
            </section>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((product) => {
                const selected = selectedIds.includes(String(product.id))

                return (
                  <article
                    key={product.id}
                    className={`group overflow-hidden rounded-3xl bg-white shadow-sm ring-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
                      selected ? 'ring-dh-secondary' : 'ring-transparent'
                    }`}
                  >
                    <div className="relative aspect-square bg-dh-gray">
                      <Link to={getProductUrl(product)}>
                        <img
                          src={product.image || '/logo.jpg'}
                          alt={product.name}
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleSelected(product.id)}
                        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                          selected
                            ? 'bg-dh-secondary text-dh-primary'
                            : 'bg-white text-dh-primary'
                        }`}
                      >
                        {selected ? 'Selected' : 'Select'}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeRecentlyViewed(product.id)}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-dh-primary shadow-sm hover:bg-red-500 hover:text-white"
                        aria-label={`Remove ${product.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4">
                      <Link to={getProductUrl(product)}>
                        <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold text-dh-primary hover:text-dh-secondary">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="mt-3 font-display text-xl font-bold text-dh-primary">
                        {formatPrice(product.price)}
                      </p>
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

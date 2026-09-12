import { useMemo } from 'react'
import { ArrowLeft, Camera, Eye, Image, ScanSearch, Search, Sparkles } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import SEO from '@/components/SEO'
import {
  isUsableVisualSearchResult,
  loadVisualSearchResult,
  type VisualSearchResult,
} from '@/lib/visualSearchResults'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

function formatPrice(price: string | number) {
  const value = Number(price || 0)
  if (!Number.isFinite(value) || value <= 0) return 'Check price'

  return `K${value.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getMatchLabel(tier?: string) {
  if (tier === 'exact') return 'Exact image match'
  if (tier === 'strong') return 'Strong visual match'
  return 'Visually similar'
}

function openVisibleImageSearch() {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[aria-label="Search by image"]')
  )
  const visibleButton = buttons.find((button) => button.offsetParent !== null)
  visibleButton?.click()
  visibleButton?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function ResultProductCard({
  product,
  index,
  kind,
}: {
  product: VisualSearchResult['products'][number]
  index: number
  kind: 'visual' | 'recognized'
}) {
  const productUrl = `/product/${product.slug || product.id}`
  const isVisual = kind === 'visual'

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-dh-primary/30 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <Link
        to={productUrl}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800"
      >
        <img
          src={(isVisual && product.visual_matched_image) || product.image || '/logo.jpg'}
          alt={product.name}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(event) => {
            const image = event.currentTarget
            if (image.dataset.visualFallback === 'logo') return
            if (image.dataset.visualFallback === 'product') {
              image.dataset.visualFallback = 'logo'
              image.src = '/logo.jpg'
              return
            }
            image.dataset.visualFallback = 'product'
            image.src = product.image || '/logo.jpg'
          }}
        />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-black shadow-sm ${
          isVisual
            ? 'bg-emerald-50/95 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100'
            : 'bg-indigo-50/95 text-indigo-900 dark:bg-indigo-950/90 dark:text-indigo-100'
        }`}>
          {isVisual
            ? getMatchLabel(product.visual_match_tier)
            : 'Recognized product'}
        </span>
        {isVisual && Number(product.visual_similarity || 0) > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-dh-primary shadow-sm dark:bg-slate-950/90 dark:text-white">
            #{index + 1} · {Math.round(Number(product.visual_similarity) * 100)}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.category?.name && (
          <span className="mb-1 truncate text-[10px] font-black uppercase tracking-wide text-[#9a5b00] dark:text-amber-300">
            {product.category.name}
          </span>
        )}
        <Link to={productUrl}>
          <h2 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-dh-primary transition group-hover:text-[#9a5b00] dark:text-white dark:group-hover:text-amber-300">
            {product.name}
          </h2>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="font-display text-base font-black text-dh-primary dark:text-white">
              {formatPrice(product.price)}
            </p>
            <p className="truncate text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {product.stock_label || 'In stock'}
            </p>
          </div>
          <Link
            to={productUrl}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-dh-primary text-white transition hover:bg-[#ffb54a] hover:text-dh-primary"
            aria-label={`View ${product.name}`}
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function VisualSearchResultsPage() {
  const { searchId = '' } = useParams()
  const location = useLocation()
  const result = useMemo(() => {
    const saved = loadVisualSearchResult(searchId)
    if (saved) return saved

    const routeResult = (
      location.state as { visualSearchResult?: VisualSearchResult } | null
    )?.visualSearchResult
    return isUsableVisualSearchResult(routeResult) ? routeResult : null
  }, [location.state, searchId])

  const products = result?.products || []
  const recommendations = result?.recommendations || []
  const totalResults = products.length + recommendations.length
  const bestConfidence = Math.round(Number(result?.visualMatchConfidence || 0) * 100)
  const recognizedLabel = result?.recognition.object ||
    result?.recognition.query ||
    result?.recognition.family.replace(/-/g, ' ') ||
    ''

  return (
    <div className="flex min-h-[100svh] flex-col bg-gray-50 dark:bg-slate-950">
      <SEO
        title="Visual product matches"
        description="Products matched visually from your photo on DigitalHood Marketplace."
        path={searchId ? `/visual-search/${encodeURIComponent(searchId)}` : '/visual-search'}
        noindex
      />
      <Header />

      <main className="flex-1 py-3 sm:py-5">
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-6 lg:px-8 xl:px-12">
          <section className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <Link
                  to="/shop"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-dh-primary transition hover:border-[#ffb54a] hover:bg-amber-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                  aria-label="Back to marketplace"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-dh-primary dark:bg-indigo-950 dark:text-indigo-200">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h1 className="font-display text-lg font-black leading-tight text-dh-primary dark:text-white sm:text-xl">
                    Visual matches
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {totalResults > 0
                      ? `${totalResults} relevant product${totalResults === 1 ? '' : 's'} found`
                      : 'Search the marketplace with a product photo'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openVisibleImageSearch}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-dh-primary px-4 text-xs font-black text-white transition hover:bg-[#ffb54a] hover:text-dh-primary"
              >
                <Camera className="h-4 w-4" />
                Search another photo
              </button>
            </div>

            {result && products.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 sm:px-4">
                <span className="inline-flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" />
                  Ranked by image similarity
                </span>
                {bestConfidence > 0 && <span>Best match {bestConfidence}%</span>}
                {result.visualComparedImages > 0 && (
                  <span>{result.visualComparedImages.toLocaleString()} catalogue images compared</span>
                )}
              </div>
            )}
          </section>

          {result && totalResults > 0 ? (
            <div className="space-y-5">
            {products.length > 0 && (
            <section aria-label="Visually similar products">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-black text-dh-primary dark:text-white">
                    Closest visual matches
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Ranked by similarity to the uploaded photo.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                  {products.length} visual
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product, index) => (
                  <ResultProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    kind="visual"
                  />
                ))}
              </div>
            </section>
            )}

            {recommendations.length > 0 && (
              <section aria-label="Products recognized from the photo">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/40">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-dh-primary dark:bg-slate-900 dark:text-indigo-200">
                      <ScanSearch className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-black text-dh-primary dark:text-white">
                        Recognized-product recommendations
                      </h2>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                        {recognizedLabel
                          ? `The photo appears to show ${recognizedLabel}. These are catalogue matches, not identical-image claims.`
                          : 'Relevant catalogue matches recognized from the photo.'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-900 dark:bg-slate-900 dark:text-indigo-100">
                    {recommendations.length} recommended
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {recommendations.map((product, index) => (
                    <ResultProductCard
                      key={product.id}
                      product={product}
                      index={index}
                      kind="recognized"
                    />
                  ))}
                </div>
              </section>
            )}
            </div>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-dh-primary dark:bg-slate-800 dark:text-white">
                <Search className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-display text-lg font-black text-dh-primary dark:text-white">
                {result ? 'No close visual match yet' : 'This visual search has expired'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-300">
                Use a clear product photo and try a different angle, or add a short product hint. DigitalHood will not fill image results with unrelated products.
              </p>
              <button
                type="button"
                onClick={openVisibleImageSearch}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-dh-primary px-5 text-sm font-black text-white transition hover:bg-[#ffb54a] hover:text-dh-primary"
              >
                <Camera className="h-4 w-4" />
                Start image search
              </button>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

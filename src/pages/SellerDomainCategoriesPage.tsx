import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Folder, Grid2X2, Loader2, LockKeyhole, Store } from 'lucide-react'

import SEO from '@/components/SEO'
import {
  SellerDomainCommerceFooter,
  SellerDomainCommerceHeader,
} from '@/components/seller/SellerDomainCommerceChrome'
import { fetchPublicSellerStore, type PublicSellerStore } from '@/api/publicSellers'
import {
  resolveSellerStorefrontHostname,
  type SellerStorefrontResolution,
} from '@/api/storefrontDomains'
import { getMarketplaceUrl, isSafeSellerDomainUrl } from '@/lib/sellerDomains'

export default function SellerDomainCategoriesPage({ hostname }: { hostname: string }) {
  const [resolution, setResolution] = useState<SellerStorefrontResolution | null>(null)
  const [store, setStore] = useState<PublicSellerStore | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    resolveSellerStorefrontHostname(hostname)
      .then(async (nextResolution) => {
        if (!active) return

        if (
          nextResolution.redirect &&
          isSafeSellerDomainUrl(nextResolution.domain.canonicalUrl)
        ) {
          const destination = new URL('/categories', nextResolution.domain.canonicalUrl)
          window.location.replace(destination.toString())
          return
        }

        setResolution(nextResolution)
        const nextStore = await fetchPublicSellerStore(nextResolution.seller.key, 1, 1)
        if (active) setStore(nextStore)
      })
      .catch((requestError) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Store categories are temporarily unavailable.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [hostname])

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#26248c]" aria-label="Loading store categories" />
      </div>
    )
  }

  if (!resolution || !store) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <Folder className="mx-auto h-9 w-9 text-[#26248c]" />
          <h1 className="mt-3 text-lg font-black text-[#26248c]">Categories unavailable</h1>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{error}</p>
          <a href="/" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#26248c] px-5 text-xs font-black text-white">
            Return to store
          </a>
        </div>
      </div>
    )
  }

  const { seller, storeCategories } = store
  const canonicalUrl = new URL('/categories', resolution.domain.canonicalUrl).toString()

  return (
    <div className="flex min-h-[100svh] flex-col bg-slate-50 text-slate-900">
      <SEO
        title={`${seller.storeName} categories`}
        description={`Browse product categories from ${seller.storeName} on DigitalHood Marketplace.`}
        path={canonicalUrl}
        image={seller.profilePhotoUrl}
      />

      <SellerDomainCommerceHeader
        storeName={seller.storeName}
        profilePhotoUrl={seller.profilePhotoUrl}
        marketplaceBrand
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-3 sm:px-6 lg:px-8">
        <section className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#26248c]"
              aria-label="Back to store"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#26248c]/8">
              {seller.profilePhotoUrl ? (
                <img src={seller.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-[#26248c]" />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-[#26248c] sm:text-lg">Shop by category</h1>
              <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">
                {seller.storeName} · {storeCategories.length} folders
              </p>
            </div>
          </div>
          <a
            href="/"
            className="hidden items-center gap-1 text-xs font-black text-[#26248c] sm:inline-flex"
          >
            All products <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Category folders">
          <a
            href="/"
            className="group flex min-h-28 flex-col justify-between rounded-xl bg-[#26248c] p-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Grid2X2 className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-black">All products</span>
              <span className="mt-0.5 block text-[10px] font-bold text-white/60">
                {store.stats.productsLive} items
              </span>
            </span>
          </a>

          {storeCategories.map((category) => (
            <a
              key={category.id}
              href={`/?store_category=${encodeURIComponent(category.id)}`}
              title={category.description}
              className="group flex min-h-28 flex-col justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-[#26248c]/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffb54a]/20 text-[#9a6200] transition group-hover:bg-[#ffb54a]/30">
                <Folder className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#26248c]">{category.name}</span>
                <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                  {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
                </span>
              </span>
            </a>
          ))}
        </section>

        {storeCategories.length === 0 && (
          <section className="mt-3 rounded-xl bg-white p-7 text-center ring-1 ring-slate-200">
            <Folder className="mx-auto h-8 w-8 text-[#26248c]" />
            <h2 className="mt-2 text-sm font-black text-[#26248c]">No store folders yet</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">All available products are still ready to browse.</p>
            <a href="/" className="mt-3 inline-flex items-center text-xs font-black text-[#26248c]">
              Browse all products <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </section>
        )}

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100 sm:text-xs">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
          Checkout and marketplace support remain protected by DigitalHood.
          <a href={getMarketplaceUrl('/marketplace-terms')} className="ml-auto shrink-0 font-black">Terms</a>
        </div>
      </main>

      <SellerDomainCommerceFooter storeName={seller.storeName} />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'

import Header from '@/sections/Header'
import Hero from '@/sections/Hero'
import Categories from '@/sections/Categories'
import ProductShowcase from '@/sections/ProductShowcase'
import FlashSale from '@/sections/FlashSale'
import Features from '@/sections/Features'
import Testimonials from '@/sections/Testimonials'
import Services from '@/sections/Services'
import Newsletter from '@/sections/Newsletter'
import RecentlyViewed from '@/sections/RecentlyViewed'
import Footer from '@/sections/Footer'

import {
  fetchHomeDiscovery,
  type HomeDiscoveryResponse,
  type WooProduct,
} from '@/lib/woocommerce'
import { useRecentlyViewed } from '@/context/RecentlyViewedContext'
import {
  readMarketplaceSearchHistory,
  SEARCH_HISTORY_CHANGED_EVENT,
} from '@/lib/marketplaceBrowserState'
import { deriveHomeDiscoveryInterests } from '@/lib/homeDiscovery'

type HomeProduct = {
  id: string
  name: string
  slug?: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  rating: number
  reviews: number
  badge?: string
  category: string
  type?: string
  hasOptions?: boolean
  stockStatus?: string
  stockLabel?: string
  stockTone?: 'success' | 'warning' | 'danger' | 'muted'
  canAddToCart?: boolean
  inStock?: boolean
  seller?: WooProduct['seller']
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
}

function getOriginalPriceFromHtml(product: WooProduct) {
  if (Number(product.regularPrice || 0) > Number(product.price || 0)) {
    return Number(product.regularPrice)
  }

  const priceHtml = String(product.priceHtml || '')
  const delMatch = priceHtml.match(/<del[^>]*>[\s\S]*?([0-9][0-9,.\s]*)[\s\S]*?<\/del>/i)

  if (!delMatch?.[1]) return undefined

  const value = Number(delMatch[1].replace(/[^0-9.]/g, ''))

  if (!Number.isFinite(value) || value <= product.price) return undefined

  return value
}

function toHomeProduct(product: WooProduct, badge?: string): HomeProduct {
  const category = product.categories?.[0]?.name || 'Marketplace'

  return {
    id: String(product.id),
    name: product.name,
    slug: product.slug,
    price: Number(product.price || 0),
    originalPrice: getOriginalPriceFromHtml(product),
    image: product.image || product.images?.[0] || '/logo.jpg',
    images: product.images || [],
    rating: Number(product.averageRating || 0),
    reviews: Number(product.reviewCount || product.ratingCount || 0),
    badge: badge || product.discoveryBadge,
    category,
    type: product.type,
    hasOptions: product.hasOptions,
    stockStatus: product.stockStatus,
    stockLabel: product.stockLabel,
    stockTone: product.stockTone,
    canAddToCart: product.canAddToCart,
    inStock: product.inStock,
    seller: product.seller,
    sellerStoreName: product.sellerStoreName,
    sellerKey: product.sellerKey,
    sellerUrl: product.sellerUrl,
    sellerVerified: product.sellerVerified,
    sellerCustomerId: product.sellerCustomerId,
  }
}

const EMPTY_HOME_DISCOVERY: HomeDiscoveryResponse = {
  shelves: {
    hero: [],
    newArrivals: [],
    personalized: [],
    deals: [],
    bestSellers: [],
    trending: [],
    flashSales: [],
  },
  personalization: {
    active: false,
    interestCount: 0,
  },
  strategyVersion: 'home-discovery-v1',
  rotationKey: '',
  uniqueProductCount: 0,
}

function MarketplaceHomeSkeleton() {
  return (
    <section className="bg-white py-8 lg:py-10">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-dh-light-gray bg-white shadow-sm"
            >
              <div className="aspect-[4/3] animate-pulse bg-dh-gray" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-dh-gray" />
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-dh-gray" />
                <div className="h-5 w-1/3 animate-pulse rounded-full bg-dh-gray" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { items: recentlyViewedItems } = useRecentlyViewed()
  const [discovery, setDiscovery] = useState<HomeDiscoveryResponse>(
    EMPTY_HOME_DISCOVERY
  )
  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    readMarketplaceSearchHistory()
  )
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const refreshSearchHistory = () => {
      setSearchHistory(readMarketplaceSearchHistory())
    }

    window.addEventListener(
      SEARCH_HISTORY_CHANGED_EVENT,
      refreshSearchHistory
    )

    return () => {
      window.removeEventListener(
        SEARCH_HISTORY_CHANGED_EVENT,
        refreshSearchHistory
      )
    }
  }, [])

  const interests = useMemo(
    () =>
      deriveHomeDiscoveryInterests({
        searches: searchHistory,
        recentlyViewed: recentlyViewedItems,
      }),
    [recentlyViewedItems, searchHistory]
  )

  useEffect(() => {
    let mounted = true

    async function loadHomeProducts() {
      setIsLoadingProducts(true)
      setLoadError('')
      setDiscovery(EMPTY_HOME_DISCOVERY)

      try {
        const response = await fetchHomeDiscovery(interests, 12)

        if (!mounted) return

        setDiscovery(response)
      } catch (error) {
        console.error(error)

        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'We could not load marketplace products right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsLoadingProducts(false)
        }
      }
    }

    loadHomeProducts()

    return () => {
      mounted = false
    }
  }, [interests])

  const homeSections = useMemo(() => {
    return {
      newArrivals: discovery.shelves.newArrivals.map((product) =>
        toHomeProduct(product)
      ),
      personalized: discovery.shelves.personalized.map((product) =>
        toHomeProduct(product)
      ),
      deals: discovery.shelves.deals.map((product) => toHomeProduct(product)),
      bestSellers: discovery.shelves.bestSellers.map((product) =>
        toHomeProduct(product)
      ),
      trending: discovery.shelves.trending.map((product) =>
        toHomeProduct(product)
      ),
    }
  }, [discovery])

  return (
    <div className="flex min-h-[100svh] flex-col bg-white">
      <Header />

      <main>
        <Hero products={discovery.shelves.hero} />

        <RecentlyViewed />

        {isLoadingProducts ? (
          <MarketplaceHomeSkeleton />
        ) : loadError ? (
          <section className="bg-white py-8 lg:py-10">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 text-yellow-800">
                <p className="font-semibold">Marketplace products could not load.</p>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <ProductShowcase
              title="New Arrivals"
              subtitle="Fresh products recently added to DigitalHood"
              products={homeSections.newArrivals}
              viewAllLink="/collections/new-arrivals"
              bgColor="white"
              analyticsStrategy="newest"
            />

            {discovery.personalization.active && (
              <ProductShowcase
                title="Picked for You"
                subtitle="Based on products and searches you have explored"
                products={homeSections.personalized}
                viewAllLink="/shop"
                bgColor="gray"
                analyticsStrategy="interest-personalized"
              />
            )}

            <ProductShowcase
              title="Explore Deals"
              subtitle="Active offers and competitive value across marketplace stores"
              products={homeSections.deals}
              viewAllLink="/collections/deals"
              bgColor={discovery.personalization.active ? 'white' : 'gray'}
              analyticsStrategy="deals"
            />

            <ProductShowcase
              title="Best Sellers"
              subtitle="Popular products customers are buying"
              products={homeSections.bestSellers}
              viewAllLink="/collections/best-sellers"
              bgColor="white"
              analyticsStrategy="best-selling"
            />

            <ProductShowcase
              title="Trending Now"
              subtitle="Products getting attention across the store"
              products={homeSections.trending}
              viewAllLink="/collections/trending"
              bgColor="gray"
              analyticsStrategy="trending"
            />
          </>
        )}

        <FlashSale
          products={discovery.shelves.flashSales}
          isLoading={isLoadingProducts}
          loadError={loadError}
        />

        <Categories />

        <Testimonials />
        <Services />

        <Features />

        <Newsletter />
      </main>

      <Footer />
    </div>
  )
}

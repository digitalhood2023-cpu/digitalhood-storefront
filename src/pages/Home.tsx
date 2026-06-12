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
  fetchWooProducts,
  type WooProduct,
} from '@/lib/woocommerce'

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
}

function getOriginalPriceFromHtml(product: WooProduct) {
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
    badge,
    category,
    type: product.type,
    hasOptions: product.hasOptions,
    stockStatus: product.stockStatus,
    stockLabel: product.stockLabel,
    stockTone: product.stockTone,
    canAddToCart: product.canAddToCart,
    inStock: product.inStock,
  }
}

function hasDiscount(product: WooProduct) {
  const html = String(product.priceHtml || '').toLowerCase()

  return (
    html.includes('del') ||
    html.includes('sale') ||
    html.includes('del') ||
    product.stockLabel?.toLowerCase().includes('sale') ||
    product.stockLabel?.toLowerCase().includes('deal')
  )
}

function uniqueProducts(products: WooProduct[]) {
  const map = new Map<number, WooProduct>()

  for (const product of products) {
    if (!product?.id) continue
    map.set(Number(product.id), product)
  }

  return Array.from(map.values())
}

function MarketplaceHomeSkeleton() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-dh-light-gray bg-white shadow-sm"
            >
              <div className="aspect-square animate-pulse bg-dh-gray" />
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
  const [products, setProducts] = useState<WooProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadHomeProducts() {
      setIsLoadingProducts(true)
      setLoadError('')

      try {
        const response = await fetchWooProducts(36, 1)

        if (!mounted) return

        setProducts(uniqueProducts(response.products || []))
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
  }, [])

  const homeSections = useMemo(() => {
    const availableProducts = products.filter((product) => product.price > 0)

    const newArrivals = [...availableProducts]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 12)
      .map((product) => toHomeProduct(product, 'New'))

    const bestSellers = [...availableProducts]
      .sort((a, b) => Number(b.totalSales || 0) - Number(a.totalSales || 0))
      .slice(0, 12)
      .map((product) =>
        toHomeProduct(
          product,
          Number(product.totalSales || 0) > 0 ? 'Best Seller' : 'Popular'
        )
      )

    const deals = availableProducts
      .filter(hasDiscount)
      .slice(0, 8)
      .map((product) => toHomeProduct(product, 'Deal'))

    const trending = [...availableProducts]
      .sort((a, b) => {
        const scoreA =
          Number(a.totalSales || 0) * 2 +
          Number(a.averageRating || 0) * 10 +
          Number(a.ratingCount || 0)

        const scoreB =
          Number(b.totalSales || 0) * 2 +
          Number(b.averageRating || 0) * 10 +
          Number(b.ratingCount || 0)

        return scoreB - scoreA
      })
      .slice(0, 12)
      .map((product) => toHomeProduct(product, 'Trending'))

    const fallbackDeals =
      deals.length > 0
        ? deals
        : availableProducts
            .slice(0, 8)
            .map((product) => toHomeProduct(product, 'Explore'))

    return {
      newArrivals,
      bestSellers:
        bestSellers.length > 0
          ? bestSellers
          : newArrivals.map((product) => ({
              ...product,
              badge: 'Popular',
            })),
      deals: fallbackDeals,
      trending:
        trending.length > 0
          ? trending
          : newArrivals.map((product) => ({
              ...product,
              badge: 'Trending',
            })),
    }
  }, [products])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        <Hero />

        <RecentlyViewed />

        {isLoadingProducts ? (
          <MarketplaceHomeSkeleton />
        ) : loadError ? (
          <section className="bg-white py-12">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-yellow-800">
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
              viewAllLink="/shop?sort=newest"
              bgColor="white"
            />

            <ProductShowcase
              title="Explore Deals"
              subtitle="Good value products and offers from the marketplace"
              products={homeSections.deals}
              viewAllLink="/shop"
              bgColor="gray"
            />

            <ProductShowcase
              title="Best Sellers"
              subtitle="Popular products customers are buying"
              products={homeSections.bestSellers}
              viewAllLink="/shop?sort=best-selling"
              bgColor="white"
            />

            <ProductShowcase
              title="Trending Now"
              subtitle="Products getting attention across the store"
              products={homeSections.trending}
              viewAllLink="/shop"
              bgColor="gray"
            />
          </>
        )}

        <FlashSale />

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

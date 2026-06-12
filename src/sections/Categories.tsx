import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, TrendingUp } from 'lucide-react'

import {
  fetchWooCategories,
  type WooCategory,
} from '@/lib/woocommerce'

import {
  getCategoryInsightLabel,
  getCategoryVisual,
  sortCategoriesForMarketplace,
} from '@/lib/categoryIntelligence'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function getShopCategoryUrl(slug: string) {
  return `/shop?category=${slug}`
}

function CategorySkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-3xl bg-white shadow-sm"
        >
          <div className="h-52 animate-pulse bg-gray-200" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Categories() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  const [categories, setCategories] = useState<WooCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await fetchWooCategories()

        if (!mounted) return

        setCategories(
          sortCategoriesForMarketplace(
            response.filter((category) => category.productCount > 0)
          ).slice(0, 8)
        )
      } catch (error) {
        console.error(error)

        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'We could not load marketplace categories right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.category-title',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )

      gsap.fromTo(
        '.category-card',
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 78%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [categories.length])

  return (
    <section ref={sectionRef} className="bg-gradient-to-b from-white via-orange-50/40 to-white py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="category-title mb-12 flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
              <TrendingUp className="h-4 w-4" />
              Popular departments
            </p>

            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-4">
              Shop by Category
            </h2>

            <p className="text-lg text-dh-dark-gray max-w-xl">
              Browse high-demand departments based on live products, customer
              interest, and marketplace activity.
            </p>
          </div>

          <Link
            to="/categories"
            className="inline-flex items-center justify-center rounded-full border border-dh-primary px-5 py-3 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
          >
            View all categories
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <CategorySkeleton />
        ) : loadError ? (
          <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-6 text-yellow-800">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Categories could not load.</p>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            </div>
          </div>
        ) : categories.length > 0 ? (
          <div
            ref={cardsRef}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {categories.map((category, index) => {
              const visual = getCategoryVisual(category, index)
              const insight = getCategoryInsightLabel(category, index)

              return (
                <Link
                  key={category.id}
                  to={getShopCategoryUrl(category.slug)}
                  className="category-card group relative overflow-hidden rounded-3xl bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={visual.image}
                      alt={category.name}
                      onError={(event) => {
                        event.currentTarget.src = visual.image
                      }}
                      className="h-full w-full object-cover object-center brightness-[0.97] contrast-[1.08] saturate-[1.12] transition-transform duration-700 group-hover:scale-110"
                    />

                    <div className={`absolute inset-0 bg-gradient-to-t ${visual.tone} opacity-90 transition-opacity duration-500 group-hover:opacity-95`} />

                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-dh-primary shadow-sm backdrop-blur">
                      {insight}
                    </div>

                    <div className="absolute right-4 top-4 rounded-full bg-dh-secondary px-3 py-1 text-xs font-bold text-dh-primary shadow-sm">
                      {category.productCount} items
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="font-display text-2xl font-bold leading-tight">
                        {category.name}
                      </h3>

                      <div className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-dh-primary transition-all group-hover:bg-dh-secondary">
                        Browse products
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h3 className="font-display text-xl font-bold text-dh-primary">
              Categories are being prepared
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
              Product categories will appear here once they are available in the marketplace.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

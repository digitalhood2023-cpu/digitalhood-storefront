import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'

import {
  fetchWooCategories,
  type WooCategory,
} from '@/lib/woocommerce'

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
          className="overflow-hidden rounded-2xl bg-dh-gray"
        >
          <div className="h-48 animate-pulse bg-gray-200" />
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
          response
            .filter((category) => category.productCount > 0)
            .slice(0, 8)
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
    <section ref={sectionRef} className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="category-title mb-12 flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
              Browse the marketplace
            </p>

            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-4">
              Shop by Category
            </h2>

            <p className="text-lg text-dh-dark-gray max-w-xl">
              Find real products from the live DigitalHood store by category.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-full border border-dh-primary px-5 py-3 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
          >
            View all products
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
            {categories.map((category) => (
              <Link
                key={category.id}
                to={getShopCategoryUrl(category.slug)}
                className="category-card group relative overflow-hidden rounded-2xl bg-dh-gray shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={category.image || '/logo.jpg'}
                    alt={category.name}
                    onError={(event) => {
                      event.currentTarget.src = '/logo.jpg'
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-dh-primary/85 via-dh-primary/25 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500" />

                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-sm font-semibold text-dh-primary">
                      {category.productCount} items
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-display font-semibold text-xl text-dh-primary mb-2 group-hover:text-dh-secondary transition-colors">
                    {category.name}
                  </h3>

                  <p className="line-clamp-2 min-h-[2.5rem] text-sm text-dh-dark-gray mb-4">
                    {category.description ||
                      `Explore ${category.name.toLowerCase()} available on DigitalHood.`}
                  </p>

                  <div className="flex items-center text-dh-primary font-medium text-sm group-hover:gap-3 transition-all">
                    <span>Explore category</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-dh-secondary rounded-2xl transition-colors duration-300 pointer-events-none" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-dh-gray p-8 text-center">
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

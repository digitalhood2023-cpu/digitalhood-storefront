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

const categoryImageRules: Array<{
  keywords: string[]
  image: string
}> = [
  {
    keywords: ['adapter', 'adaptor', 'charger adapter', 'wall charger', 'plug'],
    image:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['adhesive', 'glue', 'tape', 'repair adhesive', 'seal'],
    image:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['battery', 'batteries', 'power cell', 'phone battery'],
    image:
      'https://images.unsplash.com/photo-1609592806596-b43bada2f569?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['bluetooth', 'speaker', 'wireless speaker'],
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['cable', 'cables', 'usb cable', 'charging cable', 'type c', 'type-c', 'lightning'],
    image:
      'https://images.unsplash.com/photo-1619362513491-3d00ec2467bb?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['earphone', 'earphones', 'earbud', 'earbuds', 'headphone', 'headphones', 'audio'],
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['screen protector', 'protector', 'tempered glass', 'glass protector'],
    image:
      'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['cover', 'case', 'phone case', 'back cover', 'silicone case'],
    image:
      'https://images.unsplash.com/photo-1601593346740-925612772716?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['smartphone', 'smartphones', 'phone', 'phones', 'mobile phone', 'mobile phones'],
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['iphone', 'apple'],
    image:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['samsung', 'galaxy'],
    image:
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['laptop', 'laptops', 'computer', 'computers', 'macbook', 'notebook'],
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['tablet', 'tablets', 'ipad', 'e-reader', 'e reader'],
    image:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['camera', 'cameras', 'photography'],
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['tv', 'television', 'home theater', 'home theatre', 'monitor', 'display'],
    image:
      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['game', 'gaming', 'console', 'playstation', 'xbox'],
    image:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['watch', 'smartwatch', 'smart watch', 'wearable'],
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['power bank', 'powerbank', 'portable charger'],
    image:
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['repair', 'spare', 'spares', 'parts', 'replacement', 'tools', 'tool'],
    image:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['deal', 'deals', 'sale', 'offers', 'discount'],
    image:
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&h=650&fit=crop&q=90',
  },
  {
    keywords: ['service', 'services', 'support'],
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&h=650&fit=crop&q=90',
  },
]

const defaultCategoryImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&h=650&fit=crop&q=90',
  'https://images.unsplash.com/photo-1619362513491-3d00ec2467bb?w=900&h=650&fit=crop&q=90',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&h=650&fit=crop&q=90',
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&h=650&fit=crop&q=90',
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&h=650&fit=crop&q=90',
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&h=650&fit=crop&q=90',
]

function normalizeCategoryText(value = '') {
  return value
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCategoryImage(category: WooCategory, index: number) {
  const currentImage = String(category.image || '')

  if (
    currentImage &&
    !currentImage.includes('/logo.jpg') &&
    !currentImage.endsWith('logo.jpg')
  ) {
    return currentImage
  }

  const slug = normalizeCategoryText(category.slug || '')
  const name = normalizeCategoryText(category.name || '')
  const description = normalizeCategoryText(category.description || '')
  const searchableText = `${slug} ${name} ${description}`

  const matchedRule = categoryImageRules.find((rule) =>
    rule.keywords.some((keyword) =>
      searchableText.includes(normalizeCategoryText(keyword))
    )
  )

  if (matchedRule) {
    return matchedRule.image
  }

  return defaultCategoryImages[index % defaultCategoryImages.length]
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
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={getShopCategoryUrl(category.slug)}
                className="category-card group relative overflow-hidden rounded-2xl bg-dh-gray shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getCategoryImage(category, index)}
                    alt={category.name}
                    onError={(event) => {
                      event.currentTarget.src = '/logo.jpg'
                    }}
                    className="w-full h-full object-cover object-center brightness-[0.96] contrast-[1.06] saturate-[1.08] transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-dh-primary/80 via-dh-primary/25 to-transparent opacity-65 group-hover:opacity-80 transition-opacity duration-500" />

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

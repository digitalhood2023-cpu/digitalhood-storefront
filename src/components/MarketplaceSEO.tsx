import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SEO from '@/components/SEO'
import { fetchPublicSellerStore, type PublicSellerStore } from '@/api/publicSellers'
import { fetchWooProductBySlug, type WooProduct } from '@/lib/woocommerce'
import {
  buildBreadcrumbSchema,
  buildOnlineStoreSchema,
  buildProductSchema,
  buildSellerProfileSchemas,
  buildWebPageSchema,
  buildWebsiteSchema,
} from '@/lib/structuredData'
import { SITE, type SeoConfig } from '@/lib/site'

const API_BASE_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'

type StaticRoute = SeoConfig & {
  heading: string
  schemaType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage'
}

const STATIC_ROUTES: Record<string, StaticRoute> = {
  '/shop': {
    heading: 'Shop',
    title: 'Shop Phones, Laptops & Tech in Zambia',
    description:
      'Browse verified phones, laptops, accessories and technology products from DigitalHood Marketplace sellers in Zambia.',
    path: '/shop',
    schemaType: 'CollectionPage',
  },
  '/categories': {
    heading: 'Categories',
    title: 'Technology Product Categories',
    description:
      'Browse DigitalHood Marketplace categories for phones, laptops, accessories, repairs and trusted technology services in Zambia.',
    path: '/categories',
    schemaType: 'CollectionPage',
  },
  '/phone-accessories-zambia': {
    heading: 'Phone Accessories',
    title: 'Phone Accessories in Zambia',
    description:
      'Shop phone accessories from trusted sellers on DigitalHood Marketplace Zambia.',
    path: '/phone-accessories-zambia',
    schemaType: 'CollectionPage',
  },
  '/iphone-zambia': {
    heading: 'iPhones',
    title: 'Buy iPhones in Zambia',
    description:
      'Compare iPhones, prices and availability from trusted sellers on DigitalHood Marketplace Zambia.',
    path: '/iphone-zambia',
    schemaType: 'CollectionPage',
  },
  '/samsung-phones-zambia': {
    heading: 'Samsung Phones',
    title: 'Buy Samsung Phones in Zambia',
    description:
      'Compare Samsung smartphones, prices and availability on DigitalHood Marketplace Zambia.',
    path: '/samsung-phones-zambia',
    schemaType: 'CollectionPage',
  },
  '/laptops-zambia': {
    heading: 'Laptops',
    title: 'Buy Laptops in Zambia',
    description:
      'Shop laptops for business, school and personal use from trusted sellers on DigitalHood Marketplace Zambia.',
    path: '/laptops-zambia',
    schemaType: 'CollectionPage',
  },
  '/headphones-zambia': {
    heading: 'Headphones',
    title: 'Buy Headphones in Zambia',
    description:
      'Shop headphones and audio accessories from trusted sellers on DigitalHood Marketplace Zambia.',
    path: '/headphones-zambia',
    schemaType: 'CollectionPage',
  },
  '/power-banks-zambia': {
    heading: 'Power Banks',
    title: 'Buy Power Banks in Zambia',
    description:
      'Shop reliable power banks and charging accessories on DigitalHood Marketplace Zambia.',
    path: '/power-banks-zambia',
    schemaType: 'CollectionPage',
  },
  '/screen-repair-zambia': {
    heading: 'Screen Repair',
    title: 'Phone Screen Repair in Zambia',
    description:
      'Find trusted phone screen repair information and support through DigitalHood Zambia.',
    path: '/screen-repair-zambia',
  },
  '/about': {
    heading: 'About DigitalHood',
    title: 'About DigitalHood Marketplace Zambia',
    description:
      'Learn about DigitalHood Creations Limited and our mission to build a trusted, secure and scalable online marketplace in Zambia.',
    path: '/about',
    schemaType: 'AboutPage',
  },
  '/contact': {
    heading: 'Contact',
    title: 'Contact DigitalHood Zambia',
    description:
      'Contact DigitalHood Marketplace for sales, customer service and marketplace support in Zambia.',
    path: '/contact',
    schemaType: 'ContactPage',
  },
  '/support': {
    heading: 'Support',
    title: 'DigitalHood Marketplace Support',
    description:
      'Get help with DigitalHood Marketplace orders, products, payments and account questions.',
    path: '/support',
  },
  '/help': {
    heading: 'Help Centre',
    title: 'DigitalHood Help Centre',
    description:
      'Find guidance for shopping, payments, delivery, returns and support on DigitalHood Marketplace.',
    path: '/help',
  },
  '/faqs': {
    heading: 'Frequently Asked Questions',
    title: 'DigitalHood Marketplace FAQs',
    description:
      'Read answers to common questions about DigitalHood Marketplace shopping, payments, delivery and support.',
    path: '/faqs',
  },
  '/shipping': {
    heading: 'Shipping',
    title: 'DigitalHood Shipping Information',
    description:
      'Read DigitalHood Marketplace shipping and delivery information for customers in Zambia.',
    path: '/shipping',
  },
  '/returns': {
    heading: 'Returns',
    title: 'DigitalHood Returns Information',
    description:
      'Read the applicable returns information for purchases made through DigitalHood Marketplace.',
    path: '/returns',
  },
  '/warranty': {
    heading: 'Warranty',
    title: 'DigitalHood Warranty Information',
    description:
      'Read warranty information for products sold through DigitalHood Marketplace.',
    path: '/warranty',
  },
  '/terms': {
    heading: 'Terms',
    title: 'DigitalHood Terms and Conditions',
    description:
      'Read the terms and conditions governing use of DigitalHood Marketplace.',
    path: '/terms',
  },
  '/privacy': {
    heading: 'Privacy',
    title: 'DigitalHood Privacy Policy',
    description:
      'Read how DigitalHood handles personal information and protects marketplace users.',
    path: '/privacy',
  },
  '/cookies': {
    heading: 'Cookies',
    title: 'DigitalHood Cookie Policy',
    description:
      'Read how DigitalHood uses cookies and related technologies.',
    path: '/cookies',
  },
  '/marketplace-terms': {
    heading: 'Marketplace Terms',
    title: 'DigitalHood Marketplace Terms',
    description:
      'Read the rules and responsibilities that apply to DigitalHood Marketplace users.',
    path: '/marketplace-terms',
  },
  '/seller-terms': {
    heading: 'Seller Terms',
    title: 'DigitalHood Seller Terms',
    description:
      'Read the terms and responsibilities that apply to sellers on DigitalHood Marketplace.',
    path: '/seller-terms',
  },
  '/prohibited-products': {
    heading: 'Prohibited Products',
    title: 'DigitalHood Prohibited Products Policy',
    description:
      'Review products and listings that are not permitted on DigitalHood Marketplace.',
    path: '/prohibited-products',
  },
  '/dispute-resolution': {
    heading: 'Dispute Resolution',
    title: 'DigitalHood Dispute Resolution Policy',
    description:
      'Read how marketplace disputes are reviewed and handled by DigitalHood.',
    path: '/dispute-resolution',
  },
  '/data-protection': {
    heading: 'Data Protection',
    title: 'DigitalHood Data Protection',
    description:
      'Read the DigitalHood Marketplace approach to privacy and data protection.',
    path: '/data-protection',
  },
  '/incident-response': {
    heading: 'Incident Response',
    title: 'DigitalHood Incident Response',
    description:
      'Read how DigitalHood responds to security and marketplace incidents.',
    path: '/incident-response',
  },
}

const CANONICAL_ALIASES: Record<string, string> = {
  '/buy-iphone-zambia': '/iphone-zambia',
  '/buy-samsung-zambia': '/samsung-phones-zambia',
  '/buy-laptop-zambia': '/laptops-zambia',
  '/phone-repair-lusaka': '/screen-repair-zambia',
}

const NOINDEX_PREFIXES = [
  '/cart',
  '/checkout',
  '/wishlist',
  '/recently-viewed',
  '/track-order',
  '/account',
  '/login',
  '/register',
  '/orders',
  '/support/track',
  '/sitemap',
  '/blog',
]

const normalizePath = (pathname: string) =>
  pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/'

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function fetchRawProduct(productId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}`)
    if (!response.ok) return null
    const data = await response.json()
    return (data?.product || data) as Record<string, any>
  } catch {
    return null
  }
}

export default function MarketplaceSEO() {
  const location = useLocation()
  const pathname = normalizePath(location.pathname)
  const productMatch = pathname.match(/^\/product\/([^/]+)$/)
  const sellerMatch = pathname.match(/^\/(?:seller|stores)\/([^/]+)$/)
  const productSlug = productMatch ? decodeSegment(productMatch[1]) : ''
  const sellerKey = sellerMatch ? decodeSegment(sellerMatch[1]) : ''

  const [product, setProduct] = useState<WooProduct | null>(null)
  const [rawProduct, setRawProduct] = useState<Record<string, any> | null>(null)
  const [productFailed, setProductFailed] = useState(false)
  const [sellerStore, setSellerStore] = useState<PublicSellerStore | null>(null)
  const [sellerFailed, setSellerFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setProduct(null)
    setRawProduct(null)
    setProductFailed(false)
    if (!productSlug) return () => undefined

    fetchWooProductBySlug(productSlug)
      .then(async (loadedProduct) => {
        if (cancelled) return
        if (!loadedProduct) {
          setProductFailed(true)
          return
        }
        setProduct(loadedProduct)
        const raw = await fetchRawProduct(Number(loadedProduct.id))
        if (!cancelled) setRawProduct(raw)
      })
      .catch(() => {
        if (!cancelled) setProductFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [productSlug])

  useEffect(() => {
    let cancelled = false
    setSellerStore(null)
    setSellerFailed(false)
    if (!sellerKey) return () => undefined

    fetchPublicSellerStore(sellerKey)
      .then((store) => {
        if (!cancelled) setSellerStore(store)
      })
      .catch(() => {
        if (!cancelled) setSellerFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [sellerKey])

  const routeSeo = useMemo<SeoConfig>(() => {
    if (pathname === '/') {
      return {
        path: '/',
        structuredData: [buildOnlineStoreSchema(), buildWebsiteSchema()],
      }
    }

    if (productSlug) {
      if (product) {
        const path = `/product/${encodeURIComponent(product.slug || productSlug)}`
        return {
          title: product.name,
          description:
            product.shortDescription ||
            product.description ||
            `Buy ${product.name} from trusted sellers on DigitalHood Marketplace Zambia.`,
          path,
          image: product.image,
          ogType: 'product',
          structuredData: [
            buildProductSchema(product, rawProduct),
            buildBreadcrumbSchema(
              [
                { name: 'Home', path: '/' },
                { name: 'Shop', path: '/shop' },
                ...(product.categories?.[0]
                  ? [
                      {
                        name: product.categories[0].name,
                        path: `/shop?category=${product.categories[0].slug}`,
                      },
                    ]
                  : []),
                { name: product.name },
              ],
              path
            ),
          ],
        }
      }

      return {
        title: productFailed ? 'Product unavailable' : 'Marketplace product',
        description: productFailed
          ? 'This DigitalHood Marketplace product is not currently available.'
          : 'View product details, price and availability on DigitalHood Marketplace Zambia.',
        path: `/product/${encodeURIComponent(productSlug)}`,
        noindex: productFailed,
        ogType: 'product',
      }
    }

    if (sellerKey) {
      if (sellerStore) {
        const seller = sellerStore.seller
        const path = `/seller/${encodeURIComponent(seller.key)}`
        return {
          title: seller.storeName,
          description:
            seller.tagline ||
            seller.description ||
            `Shop products from ${seller.storeName} on DigitalHood Marketplace Zambia.`,
          path,
          image: seller.profilePhotoUrl || SITE.socialImage,
          ogType: 'profile',
          structuredData: [
            ...buildSellerProfileSchemas(sellerStore),
            buildBreadcrumbSchema(
              [
                { name: 'Home', path: '/' },
                { name: 'Shop', path: '/shop' },
                { name: seller.storeName },
              ],
              path
            ),
          ],
        }
      }

      return {
        title: sellerFailed ? 'Seller store unavailable' : 'DigitalHood seller store',
        description: sellerFailed
          ? 'This seller store is not currently available.'
          : 'Shop products from a DigitalHood Marketplace seller in Zambia.',
        path: `/seller/${encodeURIComponent(sellerKey)}`,
        noindex: sellerFailed,
        ogType: 'profile',
      }
    }

    if (
      NOINDEX_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return {
        title: 'Secure marketplace page',
        description: 'Secure DigitalHood Marketplace customer page.',
        path: pathname,
        noindex: true,
      }
    }

    const path = CANONICAL_ALIASES[pathname] || pathname
    const route = STATIC_ROUTES[path]
    if (route) {
      return {
        title: route.title,
        description: route.description,
        path,
        structuredData: [
          buildWebPageSchema({
            type: route.schemaType,
            name: route.heading,
            description: route.description || SITE.description,
            path,
          }),
          buildBreadcrumbSchema(
            [
              { name: 'Home', path: '/' },
              { name: route.heading },
            ],
            path
          ),
        ],
      }
    }

    return {
      title: 'Page not found',
      description: 'The requested DigitalHood Marketplace page could not be found.',
      path: pathname,
      noindex: true,
    }
  }, [
    pathname,
    productSlug,
    sellerKey,
    product,
    rawProduct,
    productFailed,
    sellerStore,
    sellerFailed,
  ])

  return <SEO priority={routeSeo.noindex ? 1000 : 1} {...routeSeo} />
}

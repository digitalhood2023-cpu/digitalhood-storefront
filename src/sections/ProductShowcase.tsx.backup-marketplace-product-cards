import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star, Eye, Check, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWishlist } from '@/context/WishlistContext'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ProductShowcaseProps {
  title: string
  subtitle: string
  products: Array<{
    id: string
    name: string
    price: number
    originalPrice?: number
    image: string
    rating: number
    reviews: number
    badge?: string
    category: string
  }>
  viewAllLink: string
  bgColor?: 'white' | 'gray'
}

export default function ProductShowcase({
  title,
  subtitle,
  products,
  viewAllLink,
  bgColor = 'white',
}: ProductShowcaseProps) {
  const addItem = useCartStore((state) => state.addItem)
  const { toggleWishlist, isInWishlist } = useWishlist()
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.showcase-header',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      )

      gsap.fromTo(
        '.showcase-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.showcase-grid',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const handleAddToCart = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: ProductShowcaseProps['products'][number]
  ) => {
    e.preventDefault()
    e.stopPropagation()

    addItem(
      {
        id: Number(product.id),
        name: product.name,
        slug: product.name.toLowerCase().replace(/\s+/g, '-'),
        price: product.price,
        regular_price: product.originalPrice || product.price,
        image: product.image,
      },
      1
    )

    toast.success(`${product.name} added to cart`)
    setAddedToCart(product.id)

    setTimeout(() => {
      setAddedToCart(null)
    }, 2000)
  }

  const formatPrice = (price: number) => `K${price.toLocaleString()}`

  const bgClass = bgColor === 'gray' ? 'bg-gray-50' : 'bg-white'

  return (
    <section ref={sectionRef} className={`py-16 lg:py-24 ${bgClass}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="showcase-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-black mb-2">
              {title}
            </h2>

            <p className="text-gray-600">{subtitle}</p>
          </div>

          <Link to={viewAllLink}>
            <Button
              variant="outline"
              className="border-2 border-black text-black hover:bg-black hover:text-white rounded-full px-6"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="showcase-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="showcase-card group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Link to={`/product/${product.id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </Link>

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.badge && (
                    <Badge
                      className={`${
                        product.badge === 'Sale'
                          ? 'bg-red-500'
                          : product.badge === 'Hot'
                            ? 'bg-orange-500'
                            : product.badge === 'New'
                              ? 'bg-green-500'
                              : product.badge === 'Best Seller'
                                ? 'bg-purple-500'
                                : product.badge === 'Trending'
                                  ? 'bg-blue-500'
                                  : 'bg-[#ffb54a] text-black'
                      } text-white text-xs font-semibold`}
                    >
                      {product.badge}
                    </Badge>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => toggleWishlist(product as any)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                      isInWishlist(product.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 hover:text-red-500'
                    }`}
                    aria-label="Add to wishlist"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isInWishlist(product.id) ? 'fill-current' : ''
                      }`}
                    />
                  </button>

                  <Link
                    to={`/product/${product.id}`}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-black transition-all hover:scale-110"
                    aria-label="View product"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <Button
                    onClick={(e) => handleAddToCart(e, product)}
                    className={`w-full rounded-lg text-xs transition-all ${
                      addedToCart === product.id
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                    } text-white`}
                    size="sm"
                  >
                    {addedToCart === product.id ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-3 h-3 fill-[#ffb54a] text-[#ffb54a]" />
                  <span className="text-xs font-medium">
                    {product.rating}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({product.reviews})
                  </span>
                </div>

                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm">
                    {formatPrice(product.price)}
                  </span>

                  {product.originalPrice && (
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
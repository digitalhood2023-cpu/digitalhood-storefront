import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star, Eye, Check, X } from 'lucide-react'
import { useRecentlyViewed } from '@/context/RecentlyViewedContext'
import { useWishlist } from '@/context/WishlistContext'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function RecentlyViewed() {
  const { items, hasItems, clearRecentlyViewed } = useRecentlyViewed()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const addItem = useCartStore((state) => state.addItem)

  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasItems) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.recently-viewed-title',
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
        '.recent-item',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.recently-viewed-grid',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [hasItems, items])

  const handleAddToCart = (product: typeof items[number]) => {
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

    setAddedToCart(String(product.id))

    setTimeout(() => {
      setAddedToCart(null)
    }, 2000)
  }

  const formatPrice = (price: number) => `K${price.toLocaleString()}`

  if (!hasItems) return null

  return (
    <section
      ref={sectionRef}
      className="py-16 lg:py-24 bg-gray-50 border-t border-gray-200"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="recently-viewed-title flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-black mb-2">
              Recently Viewed
            </h2>

            <p className="text-gray-600">Pick up where you left off</p>
          </div>

          <button
            onClick={clearRecentlyViewed}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Clear History
          </button>
        </div>

        <div className="recently-viewed-grid overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 min-w-max sm:min-w-0">
            {items.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="recent-item group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 w-48 sm:w-auto flex-shrink-0 sm:flex-shrink"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Link to={`/product/${product.id}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </Link>

                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => toggleWishlist(product)}
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
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-[#ffb54a] text-[#ffb54a]" />

                    <span className="text-xs font-medium">
                      {product.rating}
                    </span>
                  </div>

                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-sm font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display font-bold text-sm">
                      {formatPrice(product.price)}
                    </span>

                    {product.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleAddToCart(product)}
                    className={`w-full transition-all text-xs h-8 ${
                      addedToCart === String(product.id)
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                    } text-white`}
                    size="sm"
                  >
                    {addedToCart === String(product.id) ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Eye, Check } from 'lucide-react';
import { products } from '@/data/products';
import { useWishlist } from '@/context/WishlistContext';
import { useAddToCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function FeaturedProducts() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const [addedToCart, setAddedToCart] = useState<number | null>(null);

  const addToCart = useAddToCart();

  const { toggleWishlist, isInWishlist } = useWishlist();

  const featuredProducts = products.slice(0, 8);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.featured-header',
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
      );

      gsap.fromTo(
        '.product-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.products-grid',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart.mutate(
      {
        productId: Number(product.id),
        quantity: 1,
      },
      {
        onSuccess: () => {
          setAddedToCart(Number(product.id));

          setTimeout(() => {
            setAddedToCart(null);
          }, 2000);
        },
      }
    );
  };

  const formatPrice = (price: number) => {
    return `K${price.toLocaleString()}`;
  };

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-dh-gray">
      <div className="container mx-auto px-4">
        <div className="featured-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-dh-primary mb-3">
              Featured Products
            </h2>

            <p className="text-lg text-dh-dark-gray">
              Handpicked for quality and value
            </p>
          </div>

          <Link to="/shop">
            <Button
              variant="outline"
              className="border-2 border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white rounded-full px-6"
            >
              View All Products
            </Button>
          </Link>
        </div>

        <div className="products-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative aspect-square overflow-hidden bg-dh-gray">
                <Link to={`/product/${product.id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </Link>

                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.badge && (
                    <Badge
                      className={`${
                        product.badge === 'Sale'
                          ? 'bg-red-500'
                          : product.badge === 'Hot'
                          ? 'bg-orange-500'
                          : 'bg-dh-secondary text-dh-black'
                      } text-white font-semibold`}
                    >
                      {product.badge}
                    </Badge>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                      isInWishlist(product.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-dh-dark-gray hover:text-red-500'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isInWishlist(product.id) ? 'fill-current' : ''
                      }`}
                    />
                  </button>

                  <Link
                    to={`/product/${product.id}`}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-dh-dark-gray hover:text-dh-primary transition-all hover:scale-110"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleAddToCart(product);
                    }}
                    disabled={addToCart.isPending}
                    className={`w-full rounded-xl transition-all ${
                      addedToCart === Number(product.id)
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-dh-primary hover:bg-dh-secondary'
                    } text-white`}
                    size="sm"
                  >
                    {addedToCart === Number(product.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-dh-secondary text-dh-secondary" />

                  <span className="text-sm font-medium text-dh-primary">
                    {product.rating}
                  </span>

                  <span className="text-sm text-dh-text-gray">
                    ({product.reviews})
                  </span>
                </div>

                <Link to={`/product/${product.id}`}>
                  <h3 className="font-medium text-dh-primary hover:text-dh-secondary transition-colors line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg text-dh-primary">
                    {formatPrice(product.price)}
                  </span>

                  {product.originalPrice && (
                    <span className="text-sm text-dh-text-gray line-through">
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
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Filter,
  Grid3X3,
  List,
  Heart,
  ShoppingCart,
  Star,
  CheckCircle,
  Search,
} from 'lucide-react';

import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchWooProducts, type WooProduct } from '@/lib/woocommerce';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type SortOption = 'featured' | 'price-low' | 'price-high' | 'newest';

export default function ShopPage() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWooProducts(24)
      .then((items) => {
        setProducts(items);
        setLoadError('');
      })
      .catch((error) => {
        console.error(error);
        setLoadError('We could not load live products from DigitalHood right now.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.shop-content',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!query) return true;

        return (
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.shortDescription.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-low':
            return a.price - b.price;
          case 'price-high':
            return b.price - a.price;
          case 'newest':
            return b.id - a.id;
          default:
            return 0;
        }
      });
  }, [products, searchQuery, sortBy]);

  const formatPrice = (price: number) =>
    `K${price.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div ref={pageRef} className="min-h-screen bg-gray-50">
      <SEO
        title="Shop"
        description="Shop live DigitalHood products from WooCommerce including phones, laptops, accessories and tech services in Zambia."
        path="/shop"
      />

      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mb-8">
            <Badge className="mb-4 bg-[#ffb54a] text-black hover:bg-[#ffb54a]">
              Live WooCommerce Products
            </Badge>

            <h1 className="font-display font-bold text-2xl lg:text-3xl text-black mb-4">
              Shop DigitalHood Products
            </h1>

            <p className="text-gray-600 max-w-3xl mb-6">
              These products are loaded directly from your WooCommerce backend on digitalhood.info.
              Prices, images and availability now come from WordPress.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search live products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="shop-content">
            <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <p className="text-gray-600 text-sm">
                Showing{' '}
                <span className="font-semibold text-black">
                  {filteredProducts.length}
                </span>{' '}
                live products
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>
                </div>

                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 animate-pulse">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4" />
                    <div className="h-4 bg-gray-100 rounded mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <h3 className="text-xl font-semibold text-black mb-2">
                  Could not load products
                </h3>
                <p className="text-gray-500 mb-6">{loadError}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try again
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">
                  Try searching for another product name.
                </p>
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                </Button>
              </div>
            ) : (
              <div
                className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'grid-cols-1 gap-4'
                }`}
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                      viewMode === 'list' ? 'flex' : ''
                    }`}
                  >
                    <div
                      className={`relative overflow-hidden bg-gray-100 ${
                        viewMode === 'list' ? 'w-48 shrink-0' : 'aspect-square'
                      }`}
                    >
                      <a href={product.permalink}>
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </a>

                      <Badge className="absolute top-2 left-2 bg-black text-white font-semibold text-xs">
                        {product.inStock ? 'In stock' : 'Out of stock'}
                      </Badge>

                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-8 h-8 rounded-full bg-white text-gray-600 hover:text-red-500 flex items-center justify-center transition-all hover:scale-110">
                          <Heart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 fill-[#ffb54a] text-[#ffb54a]" />
                        <span className="text-sm font-medium">Live</span>
                        <span className="text-sm text-gray-400">WooCommerce</span>
                      </div>

                      <a href={product.permalink}>
                        <h3 className="font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2">
                          {product.name}
                        </h3>
                      </a>

                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {product.shortDescription || product.description || 'DigitalHood product'}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-display font-bold text-lg">
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      <a href={product.permalink}>
                        <Button
                          className="w-full bg-black hover:bg-[#ffb54a] hover:text-black text-white"
                          size="sm"
                        >
                          {product.hasOptions ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Select Options
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Buy on WooCommerce
                            </>
                          )}
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 rounded-2xl bg-black text-white p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Checkout is handled securely by WooCommerce
            </h2>
            <p className="text-white/75 max-w-3xl">
              For this first integration, product browsing happens on React while product
              selection and payment continue through digitalhood.info. This keeps Stripe,
              Lenco and future payment methods stable while we build the marketplace frontend.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

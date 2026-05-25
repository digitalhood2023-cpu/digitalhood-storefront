import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Filter,
  Grid3X3,
  List,
  Heart,
  ShoppingCart,
  Star,
  CheckCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import SEO from '@/components/SEO';
import StockBadge from '@/components/StockBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cartStore';
import {
  fetchWooCategories,
  fetchWooProducts,
  type WooCategory,
  type WooProduct,
} from '@/lib/woocommerce';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type SortOption =
  | 'featured'
  | 'price-low'
  | 'price-high'
  | 'newest'
  | 'best-selling'
  | 'rating';

const PRODUCTS_PER_PAGE = 24;

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getRatingText(product: WooProduct) {
  const averageRating = safeNumber(product.averageRating);
  const ratingCount = safeNumber(product.ratingCount);

  if (!averageRating || ratingCount <= 0) {
    return 'No verified ratings yet';
  }

  return `${averageRating.toFixed(1)} · ${ratingCount} verified ${
    ratingCount === 1 ? 'rating' : 'ratings'
  }`;
}

function getSoldText(product: WooProduct) {
  const totalSales = safeNumber(product.totalSales);

  if (totalSales <= 0) {
    return '';
  }

  return `${totalSales.toLocaleString()} sold`;
}

function getProductPrice(product: WooProduct) {
  return safeNumber(product.price);
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlugFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search') || '';

  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWooCategories()
      .then((items) => setCategories(items))
      .catch((error) => {
        console.error(error);
        setCategories([]);
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    if (!categories.length) return;

    if (searchFromUrl !== searchQuery) {
      setSearchQuery(searchFromUrl);
    }

    if (!categorySlugFromUrl) {
      setSelectedCategoryId(null);
      return;
    }

    const matchedCategory = categories.find(
      (category) => category.slug === categorySlugFromUrl
    );

    if (matchedCategory) {
      setSelectedCategoryId(matchedCategory.id);
    }
  }, [categories, categorySlugFromUrl, searchFromUrl]);

  useEffect(() => {
    setIsLoading(true);

    fetchWooProducts(PRODUCTS_PER_PAGE, page, searchQuery, selectedCategoryId)
      .then(({ products, total, totalPages }) => {
        setProducts(products);
        setTotalProducts(total);
        setTotalPages(totalPages || 1);
        setLoadError('');

        if (page > 1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch((error) => {
        console.error(error);
        setLoadError(
          error?.message || 'We could not load products right now. Please try again.'
        );
      })
      .finally(() => setIsLoading(false));
  }, [page, searchQuery, selectedCategoryId]);

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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const selectedCategorySlug = selectedCategory?.slug;

  const updateShopUrl = (categorySlug?: string | null, search?: string) => {
    const params: Record<string, string> = {};

    if (categorySlug) {
      params.category = categorySlug;
    }

    if (search?.trim()) {
      params.search = search.trim();
    }

    setSearchParams(params);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateShopUrl(selectedCategorySlug || categorySlugFromUrl, value);
  };

  const handleAllProductsClick = () => {
    setSelectedCategoryId(null);
    updateShopUrl(null, searchQuery);
  };

  const handleCategoryClick = (category: WooCategory) => {
    setSelectedCategoryId(category.id);
    updateShopUrl(category.slug, searchQuery);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setSearchParams({});
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return getProductPrice(a) - getProductPrice(b);
        case 'price-high':
          return getProductPrice(b) - getProductPrice(a);
        case 'newest':
          return safeNumber(b.id) - safeNumber(a.id);
        case 'best-selling':
          return safeNumber(b.totalSales) - safeNumber(a.totalSales);
        case 'rating':
          return safeNumber(b.averageRating) - safeNumber(a.averageRating);
        default:
          return 0;
      }
    });
  }, [products, sortBy]);

  const formatPrice = (price: number) =>
    `K${safeNumber(price).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const goToPreviousPage = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage((current) => current + 1);
    }
  };

  const handleAddToCart = (product: WooProduct) => {
    if (product.hasOptions || product.type === 'variable') {
      return;
    }

    if (!product.canAddToCart) {
      alert(product.stockLabel || 'This product is currently unavailable.');
      return;
    }

    const added = addItem(
      {
        id: Number(product.id),
        productId: Number(product.id),
        name: product.name,
        slug: product.slug,
        type: product.type,
        price: product.price,
        regular_price: product.price,
        image: product.image,
        stock_status: product.stockStatus || product.stock_status,
        stock_quantity: product.stockQuantity ?? product.stock_quantity,
        manage_stock: product.manageStock ?? product.manage_stock,
        stock_label: product.stockLabel || product.stock_label,
        stock_tone: product.stockTone || product.stock_tone,
        can_add_to_cart: product.canAddToCart ?? product.can_add_to_cart,
      },
      1
    );

    if (!added) {
      return;
    }

    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-gray-50">
      <SEO
        title="Shop"
        description="Shop phones, laptops, accessories, services and trusted products on DigitalHood Marketplace Zambia."
        path="/shop"
      />

      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mb-8">
            <Badge className="mb-4 bg-[#ffb54a] text-black hover:bg-[#ffb54a]">
              DigitalHood Marketplace
            </Badge>

            <h1 className="font-display font-bold text-2xl lg:text-3xl text-black mb-4">
              Shop Trusted Products in Zambia
            </h1>

            <p className="text-gray-600 max-w-3xl mb-6">
              Discover phones, laptops, accessories, services and verified products from
              DigitalHood. Built for safe, simple and reliable online shopping in Zambia.
            </p>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={handleAllProductsClick}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedCategoryId === null
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  All Products
                </button>

                {categoriesLoading ? (
                  <>
                    <div className="h-10 w-24 rounded-full bg-white animate-pulse" />
                    <div className="h-10 w-28 rounded-full bg-white animate-pulse" />
                    <div className="h-10 w-20 rounded-full bg-white animate-pulse" />
                  </>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        selectedCategoryId === category.id
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {category.name}
                      <span className="ml-2 text-xs opacity-70">
                        {category.productCount}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="shop-content">
            <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <p className="text-gray-600 text-sm">
                Showing{' '}
                <span className="font-semibold text-black">
                  {sortedProducts.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-black">
                  {totalProducts}
                </span>{' '}
                {selectedCategory ? selectedCategory.name : 'products'}
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    Sort by:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white"
                  >
                    <option value="featured">Featured</option>
                    <option value="best-selling">Best Selling</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>
                </div>

                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="List view"
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
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try another search or choose a different category.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={`grid ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'grid-cols-1 gap-4'
                  }`}
                >
                  {sortedProducts.map((product) => {
                    const soldText = getSoldText(product);
                    const ratingText = getRatingText(product);
                    const shouldViewOptions =
                      product.hasOptions || product.type === 'variable';
                    const canBuyDirectly = !shouldViewOptions && product.canAddToCart;

                    return (
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
                          <Link to={`/product/${product.slug}`}>
                            <img
                              src={product.image || '/logo.jpg'}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src = '/logo.jpg';
                              }}
                            />
                          </Link>

                          <div className="absolute top-2 left-2">
                            <StockBadge item={product as any} />
                          </div>

                          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-full bg-white text-gray-600 hover:text-red-500 flex items-center justify-center transition-all hover:scale-110"
                              aria-label={`Save ${product.name}`}
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-4 h-4 fill-[#ffb54a] text-[#ffb54a]" />
                            <span className="text-sm font-medium">{ratingText}</span>
                          </div>

                          <Link to={`/product/${product.slug}`}>
                            <h3 className="font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2">
                              {product.name}
                            </h3>
                          </Link>

                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {product.shortDescription ||
                              product.description ||
                              'DigitalHood marketplace product'}
                          </p>

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <StockBadge item={product as any} />

                            {soldText && (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                {soldText}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-display font-bold text-lg">
                              {formatPrice(product.price)}
                            </span>
                          </div>

                          {shouldViewOptions ? (
                            <Link to={`/product/${product.slug}`}>
                              <Button
                                className="w-full bg-black hover:bg-[#ffb54a] hover:text-black text-white"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                View Options
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              type="button"
                              disabled={!canBuyDirectly}
                              onClick={() => handleAddToCart(product)}
                              className={`w-full transition-all ${
                                addedToCart === product.id
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : canBuyDirectly
                                    ? 'bg-black hover:bg-[#ffb54a] hover:text-black text-white'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                              }`}
                              size="sm"
                            >
                              {addedToCart === product.id ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Added
                                </>
                              ) : canBuyDirectly ? (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Add to Cart
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  {product.stockLabel || 'Unavailable'}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    disabled={page === 1 || isLoading}
                    onClick={goToPreviousPage}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <span className="text-sm font-medium text-gray-600">
                    Page {page} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    disabled={page >= totalPages || isLoading}
                    onClick={goToNextPage}
                    className="w-full sm:w-auto"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-10 rounded-2xl bg-black text-white p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Safe shopping starts with trust
            </h2>
            <p className="text-white/75 max-w-3xl">
              DigitalHood is building a safer online marketplace for Zambia — with trusted
              listings, clear product information, secure checkout and customer support.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
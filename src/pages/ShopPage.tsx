import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  Grid3X3,
  List,
  ArrowRight,
  X,
  Heart,
  Eye,
  ShoppingCart,
  Star,
  CheckCircle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import SEO from '@/components/SEO';
import StockBadge from '@/components/StockBadge';
import SearchAutocomplete from '@/components/search/SearchAutocomplete';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cartStore';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  fetchWooCategories,
  fetchWooProducts,
  type WooCategory,
  type WooProduct,
} from '@/lib/woocommerce';
import {
  getCategoryInsightLabel,
  sortCategoriesForMarketplace,
} from '@/lib/categoryIntelligence';

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

const PRODUCTS_PER_PAGE = 48;

type PriceRangeKey =
  | 'all'
  | 'under-100'
  | '100-250'
  | '250-500'
  | '500-1000'
  | '1000-plus';

const PRICE_FILTERS: Array<{
  key: PriceRangeKey;
  label: string;
  min: number | null;
  max: number | null;
}> = [
  { key: 'all', label: 'Any price', min: null, max: null },
  { key: 'under-100', label: 'Under K100', min: null, max: 100 },
  { key: '100-250', label: 'K100 - K250', min: 100, max: 250 },
  { key: '250-500', label: 'K250 - K500', min: 250, max: 500 },
  { key: '500-1000', label: 'K500 - K1,000', min: 500, max: 1000 },
  { key: '1000-plus', label: 'K1,000+', min: 1000, max: null },
];

const STORAGE_FILTERS = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

const COLOR_FILTERS = [
  'Black',
  'White',
  'Blue',
  'Red',
  'Green',
  'Gold',
  'Silver',
  'Purple',
  'Grey',
  'Gray',
  'Pink',
  'Clear',
];

function normalizeFilterText(value = '') {
  return value
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProductFilterText(product: WooProduct) {
  const attributeText = Array.isArray(product.attributes)
    ? product.attributes
        .map((attribute) => `${attribute.name} ${attribute.options.join(' ')}`)
        .join(' ')
    : '';

  const categoryText = Array.isArray(product.categories)
    ? product.categories.map((category) => category.name).join(' ')
    : '';

  return normalizeFilterText(
    [
      product.name,
      product.slug,
      product.shortDescription,
      product.description,
      attributeText,
      categoryText,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function productMatchesPrice(product: WooProduct, rangeKey: PriceRangeKey) {
  const selectedRange = PRICE_FILTERS.find((range) => range.key === rangeKey);

  if (!selectedRange || selectedRange.key === 'all') return true;

  const price = safeNumber(product.price);

  if (selectedRange.min !== null && price < selectedRange.min) return false;
  if (selectedRange.max !== null && price > selectedRange.max) return false;

  return true;
}

function productMatchesTextOption(product: WooProduct, option: string) {
  if (!option) return true;

  return getProductFilterText(product).includes(normalizeFilterText(option));
}


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

function getPaginationItems(currentPage: number, pageCount: number) {
  const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [];

  if (pageCount <= 1) return [1];

  const addPage = (value: number) => {
    if (value >= 1 && value <= pageCount && !pages.includes(value)) {
      pages.push(value);
    }
  };

  addPage(1);

  if (currentPage > 4) {
    pages.push('ellipsis-left');
  }

  for (let pageNumber = currentPage - 1; pageNumber <= currentPage + 1; pageNumber += 1) {
    addPage(pageNumber);
  }

  if (currentPage < pageCount - 3) {
    pages.push('ellipsis-right');
  }

  addPage(pageCount);

  return pages;
}

function getProductPrice(product: WooProduct) {
  return safeNumber(product.price);
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlugFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search') || '';
  const pageFromUrl = Math.max(1, Number(searchParams.get('page') || '1') || 1);

  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [priceRange, setPriceRange] = useState<PriceRangeKey>('all');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState(searchFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { items: recentlyViewedItems, hasItems: hasRecentlyViewedItems } = useRecentlyViewed();
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const hasCompletedInitialPageSyncRef = useRef(false);
  const shouldRestoreShopScrollRef = useRef(false);

  useEffect(() => {
    fetchWooCategories()
      .then((items) =>
        setCategories(
          sortCategoriesForMarketplace(
            items.filter((category) => category.productCount > 0)
          )
        )
      )
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
      setSubmittedSearchQuery(searchFromUrl);
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
    if (pageFromUrl !== page) {
      setPage(pageFromUrl);
    }
  }, [pageFromUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = JSON.parse(
        window.sessionStorage.getItem('digitalhood-shop-return-state') || '{}'
      );

      if (stored.url === `${location.pathname}${location.search}`) {
        shouldRestoreShopScrollRef.current = true;
      }
    } catch {
      shouldRestoreShopScrollRef.current = false;
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    setIsLoading(true);

    fetchWooProducts(PRODUCTS_PER_PAGE, page, submittedSearchQuery, selectedCategoryId)
      .then(({ products, total, totalPages }) => {
        setProducts(products);
        setTotalProducts(total);
        setTotalPages(totalPages || 1);
        setLoadError('');

      })
      .catch((error) => {
        console.error(error);
        setLoadError(
          error?.message || 'We could not load products right now. Please try again.'
        );
      })
      .finally(() => setIsLoading(false));
  }, [page, submittedSearchQuery, selectedCategoryId]);

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
    if (!hasCompletedInitialPageSyncRef.current) {
      hasCompletedInitialPageSyncRef.current = true;
      return;
    }

    setPage(1);
  }, [searchQuery, selectedCategoryId]);

  useEffect(() => {
    if (isLoading || !shouldRestoreShopScrollRef.current) return;

    try {
      const stored = JSON.parse(
        window.sessionStorage.getItem('digitalhood-shop-return-state') || '{}'
      );

      if (stored.url === `${location.pathname}${location.search}`) {
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: Number(stored.scrollY || 0),
            behavior: 'auto',
          });
        });
      }
    } catch {
      // Ignore restore errors.
    } finally {
      shouldRestoreShopScrollRef.current = false;
      window.sessionStorage.removeItem('digitalhood-shop-return-state');
    }
  }, [isLoading, location.pathname, location.search, products.length]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilters]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const selectedCategorySlug = selectedCategory?.slug;
  const popularCategories = categories.slice(0, 10);
  const activeSidebarFilterCount = [
    priceRange !== 'all',
    Boolean(selectedStorage),
    Boolean(selectedColor),
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    selectedCategoryId ||
      searchQuery.trim() ||
      activeSidebarFilterCount > 0
  );
  const selectedPriceRange = PRICE_FILTERS.find(
    (range) => range.key === priceRange
  );

  const activeFilterChips = [
    selectedCategory
      ? {
          key: 'category',
          label: selectedCategory.name,
        }
      : null,
    searchQuery.trim()
      ? {
          key: 'search',
          label: `Search: ${searchQuery.trim()}`,
        }
      : null,
    selectedPriceRange && selectedPriceRange.key !== 'all'
      ? {
          key: 'price',
          label: selectedPriceRange.label,
        }
      : null,
    selectedStorage
      ? {
          key: 'storage',
          label: selectedStorage,
        }
      : null,
    selectedColor
      ? {
          key: 'color',
          label: selectedColor,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const updateShopUrl = (
    categorySlug?: string | null,
    search?: string,
    nextPage = 1
  ) => {
    const params: Record<string, string> = {};

    if (categorySlug) {
      params.category = categorySlug;
    }

    if (search?.trim()) {
      params.search = search.trim();
    }

    if (nextPage > 1) {
      params.page = String(nextPage);
    }

    setSearchParams(params);
  };

  const saveSearchHistory = (value: string) => {
    if (typeof window === 'undefined' || value.trim().length < 2) return;

    try {
      const key = 'digitalhood-shop-searches';
      const previous = JSON.parse(window.localStorage.getItem(key) || '[]');
      const next = [
        value.trim(),
        ...previous.filter((item: string) => item !== value.trim()),
      ].slice(0, 20);

      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore local storage issues.
    }
  };

  const submitShopSearch = (value = searchQuery) => {
    const cleanedValue = value.trim();

    setSearchQuery(cleanedValue);
    setSubmittedSearchQuery(cleanedValue);
    setPage(1);
    updateShopUrl(selectedCategorySlug || categorySlugFromUrl, cleanedValue);
    saveSearchHistory(cleanedValue);
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
    setPriceRange('all');
    setSelectedStorage('');
    setSelectedColor('');
    setShowMobileFilters(false);
    setSearchParams({});
  };

  const clearSidebarFilters = () => {
    setPriceRange('all');
    setSelectedStorage('');
    setSelectedColor('');
  };

  const applyMobileFilters = () => {
    setShowMobileFilters(false);

    window.setTimeout(() => {
      document
        .getElementById('shop-results')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const removeFilterChip = (key: string) => {
    if (key === 'category') {
      setSelectedCategoryId(null);
      updateShopUrl(null, searchQuery);
    }

    if (key === 'search') {
      setSearchQuery('');
      updateShopUrl(selectedCategorySlug || categorySlugFromUrl, '');
    }

    if (key === 'price') {
      setPriceRange('all');
    }

    if (key === 'storage') {
      setSelectedStorage('');
    }

    if (key === 'color') {
      setSelectedColor('');
    }
  };

  const sortedProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => {
      return (
        productMatchesPrice(product, priceRange) &&
        productMatchesTextOption(product, selectedStorage) &&
        productMatchesTextOption(product, selectedColor)
      );
    });

    return filteredProducts.sort((a, b) => {
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
  }, [products, sortBy, priceRange, selectedStorage, selectedColor]);

  const formatPrice = (price: number) =>
    `K${safeNumber(price).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const goToPreviousPage = () => {
    const nextPage = Math.max(1, page - 1);

    setPage(nextPage);
    updateShopUrl(selectedCategorySlug || categorySlugFromUrl, searchQuery, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      const nextPage = page + 1;

      setPage(nextPage);
      updateShopUrl(selectedCategorySlug || categorySlugFromUrl, searchQuery, nextPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPage = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages || isLoading) return;

    setPage(nextPage);
    updateShopUrl(selectedCategorySlug || categorySlugFromUrl, searchQuery, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveShopReturnState = () => {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem(
      'digitalhood-shop-return-state',
      JSON.stringify({
        url: `${location.pathname}${location.search}`,
        scrollY: window.scrollY,
      })
    );
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

  const FilterPanel = (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
            <SlidersHorizontal className="h-5 w-5" />
          </div>

          <h2 className="font-display text-xl font-bold text-dh-primary">
            Filters
          </h2>

          <p className="mt-1 text-xs text-dh-dark-gray">
            Refine products faster.
          </p>
        </div>

        {activeSidebarFilterCount > 0 && (
          <button
            type="button"
            onClick={clearSidebarFilters}
            className="rounded-full border border-dh-light-gray px-3 py-1.5 text-xs font-semibold text-dh-primary hover:border-dh-primary"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-bold text-dh-primary">
            Categories
          </h3>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAllProductsClick}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                selectedCategoryId === null
                  ? 'bg-dh-primary text-white'
                  : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
              }`}
            >
              <span>All products</span>
              <span className="text-xs opacity-80">{totalProducts}</span>
            </button>

            {popularCategories.slice(0, 8).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-dh-primary text-white'
                    : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
                }`}
              >
                <span className="line-clamp-1">{category.name}</span>
                <span className="ml-2 text-xs opacity-80">
                  {category.productCount}
                </span>
              </button>
            ))}

            <Link
              to="/categories"
              className="flex w-full items-center justify-center rounded-2xl border border-dh-light-gray px-3 py-2 text-sm font-semibold text-dh-primary hover:border-dh-primary"
            >
              More categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="border-t border-dh-light-gray pt-5">
          <h3 className="mb-3 text-sm font-bold text-dh-primary">
            Price
          </h3>

          <div className="space-y-2">
            {PRICE_FILTERS.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => setPriceRange(range.key)}
                className={`flex w-full items-center rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                  priceRange === range.key
                    ? 'bg-dh-primary text-white'
                    : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-dh-light-gray pt-5">
          <h3 className="mb-3 text-sm font-bold text-dh-primary">
            Storage
          </h3>

          <div className="flex flex-wrap gap-2">
            {STORAGE_FILTERS.map((storage) => (
              <button
                key={storage}
                type="button"
                onClick={() =>
                  setSelectedStorage((current) =>
                    current === storage ? '' : storage
                  )
                }
                className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                  selectedStorage === storage
                    ? 'bg-dh-primary text-white'
                    : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
                }`}
              >
                {storage}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-dh-light-gray pt-5">
          <h3 className="mb-3 text-sm font-bold text-dh-primary">
            Colour
          </h3>

          <div className="flex flex-wrap gap-2">
            {COLOR_FILTERS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  setSelectedColor((current) =>
                    current === color ? '' : color
                  )
                }
                className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                  selectedColor === color
                    ? 'bg-dh-primary text-white'
                    : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={pageRef} className="min-h-screen overflow-x-hidden bg-gray-50">
      <SEO
        title="Shop"
        description="Shop phones, laptops, accessories, services and trusted products on DigitalHood Marketplace Zambia."
        path="/shop"
      />

      <Header />

      <main className="overflow-x-hidden py-4 lg:py-6">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
                    <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge className="mb-3 bg-[#ffb54a] text-black hover:bg-[#ffb54a]">
                  DigitalHood Marketplace
                </Badge>

                <h1 className="font-display text-2xl font-bold leading-tight text-dh-primary sm:text-3xl">
                  {selectedCategory
                    ? selectedCategory.name
                    : searchQuery
                      ? 'Search products'
                      : 'Shop products'}
                </h1>

                <p className="mt-1 text-sm text-dh-dark-gray">
                  {selectedCategory
                    ? selectedCategory.description ||
                      `Browse ${selectedCategory.name.toLowerCase()} products.`
                    : 'Search, filter and shop verified marketplace products.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center rounded-full border border-dh-primary px-4 py-2 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
                  >
                    Clear filters
                    <X className="ml-2 h-4 w-4" />
                  </button>
                )}

                <Link
                  to="/categories"
                  className="inline-flex items-center rounded-full bg-dh-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-dh-secondary"
                >
                  Browse categories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <SearchAutocomplete
                initialValue={searchQuery}
                placeholder="Search products, brands, parts, accessories..."
                onSearch={(value) => submitShopSearch(value)}
              />

              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:max-w-xl">
                <button
                  type="button"
                  onClick={handleAllProductsClick}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    selectedCategoryId === null
                      ? 'bg-dh-primary text-white shadow-sm'
                      : 'border border-dh-light-gray bg-white text-dh-primary hover:border-dh-primary'
                  }`}
                >
                  All products
                </button>

                {categoriesLoading ? (
                  <>
                    <div className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-dh-gray" />
                    <div className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-dh-gray" />
                    <div className="h-10 w-20 shrink-0 animate-pulse rounded-full bg-dh-gray" />
                  </>
                ) : (
                  popularCategories.map((category, index) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      title={getCategoryInsightLabel(category, index)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        selectedCategoryId === category.id
                          ? 'bg-dh-primary text-white shadow-sm'
                          : 'border border-dh-light-gray bg-white text-dh-primary hover:border-dh-primary'
                      }`}
                    >
                      {category.name}
                      <span className="ml-2 text-xs opacity-70">
                        {category.productCount}
                      </span>
                    </button>
                  ))
                )}

                <Link
                  to="/categories"
                  className="shrink-0 rounded-full border border-dh-light-gray bg-dh-gray px-4 py-2 text-sm font-semibold text-dh-primary hover:border-dh-primary"
                >
                  More
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-4 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="flex w-full items-center justify-between rounded-3xl bg-white p-4 font-semibold text-dh-primary shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                Filters
                {activeSidebarFilterCount > 0 && (
                  <span className="rounded-full bg-dh-secondary px-2 py-0.5 text-xs text-dh-primary">
                    {activeSidebarFilterCount}
                  </span>
                )}
              </span>

              <span className="text-sm">Open</span>
            </button>

            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setShowMobileFilters(false)}
                  className="absolute inset-0 bg-black/40"
                />

                <aside className="absolute right-0 top-0 flex h-full w-[88vw] max-w-sm flex-col bg-dh-gray shadow-2xl">
                  <div className="flex items-center justify-between border-b border-dh-light-gray bg-white px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                        Refine results
                      </p>
                      <h2 className="font-display text-xl font-bold text-dh-primary">
                        Product filters
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-dh-gray text-dh-primary"
                      aria-label="Close filters"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {FilterPanel}
                  </div>

                  <div className="border-t border-dh-light-gray bg-white p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={clearSidebarFilters}
                        className="rounded-full border border-dh-primary px-4 py-3 text-sm font-semibold text-dh-primary"
                      >
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={applyMobileFilters}
                        className="rounded-full bg-dh-primary px-4 py-3 text-sm font-semibold text-white"
                      >
                        Search products
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </section>

          <div id="shop-results" className="shop-content grid max-w-full gap-5 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
                {FilterPanel}
              </div>
            </aside>

            <div className="min-w-0">
            {activeFilterChips.length > 0 && (
              <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                      Active filters
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => removeFilterChip(chip.key)}
                          className="inline-flex items-center rounded-full bg-dh-gray px-3 py-2 text-xs font-bold text-dh-primary transition-colors hover:bg-dh-secondary/25"
                        >
                          {chip.label}
                          <X className="ml-2 h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center justify-center rounded-full border border-dh-primary px-4 py-2 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm text-dh-dark-gray">
                  Showing{' '}
                  <span className="font-semibold text-dh-primary">
                    {sortedProducts.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-dh-primary">
                    {totalProducts}
                  </span>{' '}
                  {selectedCategory ? selectedCategory.name : 'products'}
                </p>

                {activeSidebarFilterCount > 0 && (
                  <p className="mt-1 text-xs text-dh-dark-gray">
                    Refined by price, storage, or colour. Showing matching products from this page.
                  </p>
                )}

                {hasActiveFilters && activeSidebarFilterCount === 0 && (
                  <p className="mt-1 text-xs text-dh-dark-gray">
                    Filters are active. Clear them anytime to return to the full marketplace.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    Sort by:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="rounded-full border border-dh-light-gray bg-white px-3 py-2 text-sm focus:border-dh-primary focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="best-selling">Best Selling</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>
                </div>

                <div className="flex items-center overflow-hidden rounded-full border border-dh-light-gray">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-dh-primary text-white'
                        : 'text-dh-dark-gray hover:bg-dh-gray'
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
                        ? 'bg-dh-primary text-white'
                        : 'text-dh-dark-gray hover:bg-dh-gray'
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
                        className={`group overflow-hidden rounded-3xl border border-transparent bg-white shadow-sm transition-all duration-300 hover:border-dh-primary/15 hover:shadow-xl ${
                          viewMode === 'list'
                            ? 'flex flex-col min-h-[220px] items-stretch hover:-translate-y-0 sm:flex-row'
                            : 'hover:-translate-y-1'
                        }`}
                      >
                        <div
                          className={`relative overflow-hidden bg-gray-100 ${
                            viewMode === 'list'
                              ? 'aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:w-48 lg:w-64'
                              : 'aspect-square'
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

                          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => toggleWishlist(product as any)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:scale-110 ${
                                isInWishlist(String(product.id))
                                  ? 'text-red-500'
                                  : 'text-gray-600 hover:text-red-500'
                              }`}
                              aria-label={`Save ${product.name}`}
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isInWishlist(String(product.id)) ? 'fill-current' : ''
                                }`}
                              />
                            </button>

                            <Link
                              to={`/product/${product.slug}`}
                              onClick={saveShopReturnState}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-all hover:scale-110 hover:text-dh-primary"
                              aria-label={`View ${product.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>

                        <div
                          className={`flex flex-1 flex-col p-4 ${
                            viewMode === 'list'
                              ? 'sm:p-5 lg:grid lg:grid-cols-[1fr_260px] lg:items-center lg:gap-6'
                              : ''
                          }`}
                        >
                          <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-1 text-xs text-dh-dark-gray">
                            <Star className="h-4 w-4 fill-[#ffb54a] text-[#ffb54a]" />
                            <span className="font-medium">{ratingText}</span>
                          </div>

                          <Link to={`/product/${product.slug}`}>
                            <h3 className="mb-2 line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-dh-primary transition-colors hover:text-[#ffb54a]">
                              {product.name}
                            </h3>
                          </Link>

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <StockBadge item={product as any} />

                            {soldText && (
                              <span className="rounded-full bg-dh-gray px-2.5 py-1 text-xs font-semibold text-dh-primary">
                                {soldText}
                              </span>
                            )}
                          </div>

                          </div>

                          <div
                            className={`mt-auto ${
                              viewMode === 'list'
                                ? 'rounded-3xl bg-dh-gray p-4 lg:mt-0'
                                : ''
                            }`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="font-display text-xl font-bold text-dh-primary">
                                {formatPrice(product.price)}
                              </span>

                              {viewMode === 'list' && (
                                <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-dh-primary lg:inline-flex">
                                  Ready to shop
                                </span>
                              )}
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
                                    ? 'bg-dh-primary hover:bg-[#ffb54a] hover:text-black text-white'
                                    : 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                              } rounded-full`}
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
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-3xl bg-white p-4 shadow-sm">
                  <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                    <p className="text-sm font-semibold text-dh-dark-gray">
                      Page <span className="text-dh-primary">{page}</span> of{' '}
                      <span className="text-dh-primary">{totalPages}</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        disabled={page === 1 || isLoading}
                        onClick={goToPreviousPage}
                        className="rounded-full"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>

                      {getPaginationItems(page, totalPages).map((item) =>
                        typeof item === 'number' ? (
                          <button
                            key={item}
                            type="button"
                            onClick={() => goToPage(item)}
                            disabled={isLoading}
                            className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition-colors ${
                              item === page
                                ? 'bg-dh-primary text-white'
                                : 'border border-dh-light-gray bg-white text-dh-primary hover:border-dh-primary'
                            }`}
                            aria-current={item === page ? 'page' : undefined}
                          >
                            {item}
                          </button>
                        ) : (
                          <span
                            key={item}
                            className="flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-bold text-dh-dark-gray"
                          >
                            ...
                          </span>
                        )
                      )}

                      <Button
                        variant="outline"
                        disabled={page >= totalPages || isLoading}
                        onClick={goToNextPage}
                        className="rounded-full"
                      >
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {hasRecentlyViewedItems && (
                  <section className="mt-8 max-w-full overflow-hidden rounded-3xl bg-white p-4 shadow-sm sm:p-5 md:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                          Continue shopping
                        </p>
                        <h2 className="font-display text-2xl font-bold text-dh-primary">
                          Recently viewed
                        </h2>
                        <p className="mt-1 text-sm text-dh-dark-gray">
                          Pick up from products you checked earlier.
                        </p>
                      </div>

                      <Link
                        to="/recently-viewed"
                        className="inline-flex items-center rounded-full border border-dh-primary px-4 py-2 text-sm font-semibold text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
                      >
                        View all
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>

                    <div className="-mx-1 flex max-w-full snap-x gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] sm:gap-4">
                      {recentlyViewedItems.slice(0, 10).map((item) => (
                        <Link
                          key={item.id}
                          to={`/product/${item.slug || item.id}`}
                          className="group w-[38vw] min-w-[132px] max-w-[158px] shrink-0 snap-start rounded-3xl border border-dh-light-gray bg-white p-2.5 transition-all hover:-translate-y-1 hover:border-dh-primary/20 hover:shadow-lg sm:w-44 sm:min-w-[176px] sm:max-w-[176px] sm:p-3"
                        >
                          <div className="aspect-square overflow-hidden rounded-2xl bg-dh-gray">
                            <img
                              src={item.image || '/logo.jpg'}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src = '/logo.jpg';
                              }}
                            />
                          </div>

                          <h3 className="mt-3 line-clamp-2 break-words text-xs font-semibold leading-snug text-dh-primary sm:text-sm">
                            {item.name}
                          </h3>

                          <p className="mt-2 font-display text-base font-bold text-dh-primary">
                            {formatPrice(Number(item.price || 0))}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { useBackButtonDismiss } from '@/hooks/useBackButtonDismiss';
import { getImageSrcSet, getOptimizedImageUrl } from '@/lib/images'
import {
  advanceProductImageFallback,
  getFastProductImage,
  getFastProductSrcSet,
  getProductImageSizes,
} from '@/lib/productImages';
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
  fetchMarketplaceProducts,
  type WooCategory,
  type WooProduct,
} from '@/lib/woocommerce';
import { saveMarketplaceSearch } from '@/lib/marketplaceBrowserState';
import { acquireBodyScrollLock } from '@/lib/bodyScrollLock';
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
  | 'rating'
  | 'trending';

const SORT_OPTIONS = new Set<SortOption>([
  'featured',
  'price-low',
  'price-high',
  'newest',
  'best-selling',
  'rating',
  'trending',
]);

function parseSortOption(
  value: string | null,
  fallback: SortOption
): SortOption {
  return value &&
    SORT_OPTIONS.has(
      value as SortOption
    )
    ? (value as SortOption)
    : fallback;
}

const COLLECTIONS: Record<
  string,
  {
    sort: SortOption;
    onSale?: boolean;
  }
> = {
  'new-arrivals': {
    sort: 'newest',
  },
  deals: {
    sort: 'featured',
    onSale: true,
  },
  'best-sellers': {
    sort: 'best-selling',
  },
  trending: {
    sort: 'trending',
  },
};

const PRODUCTS_PER_PAGE = 48;

type LegacyPriceRangeKey =
  | 'under-100'
  | '100-250'
  | '250-500'
  | '500-1000'
  | '1000-plus';

const LEGACY_PRICE_FILTERS: Record<LegacyPriceRangeKey, {
  min: number | null;
  max: number | null;
}> = {
  'under-100': { min: null, max: 100 },
  '100-250': { min: 100, max: 250 },
  '250-500': { min: 250, max: 500 },
  '500-1000': { min: 500, max: 1000 },
  '1000-plus': { min: 1000, max: null },
};

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

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizePriceParameter(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? String(numericValue)
    : '';
}

function formatCompactPrice(value: string) {
  return `K${Number(value).toLocaleString('en-ZM', {
    maximumFractionDigits: 2,
  })}`;
}

function getCustomPriceLabel(minimum: string, maximum: string) {
  if (minimum && maximum) {
    return `${formatCompactPrice(minimum)} – ${formatCompactPrice(maximum)}`;
  }

  if (minimum) return `From ${formatCompactPrice(minimum)}`;
  if (maximum) return `Up to ${formatCompactPrice(maximum)}`;

  return '';
}

function getLegacyPriceBounds(value: string | null) {
  if (!value || !(value in LEGACY_PRICE_FILTERS)) {
    return { min: '', max: '' };
  }

  const range = LEGACY_PRICE_FILTERS[value as LegacyPriceRangeKey];

  return {
    min: normalizePriceParameter(range.min),
    max: normalizePriceParameter(range.max),
  };
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getRelatedCategorySlug(query: string, categories: WooCategory[]) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return '';

  const queryTokens = normalizedQuery
    .split(' ')
    .filter((token) => token.length > 1);

  const ranked = categories
    .map((category) => {
      const categoryText = normalizeSearchText(
        `${category.name} ${category.slug} ${category.description || ''}`
      );
      const categoryTokens = new Set(categoryText.split(' '));
      const overlap = queryTokens.filter((token) =>
        categoryTokens.has(token) || categoryText.includes(token)
      ).length;
      const phraseMatch =
        categoryText.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizeSearchText(category.name));

      return {
        slug: category.slug,
        score: overlap + (phraseMatch ? 5 : 0),
      };
    })
    .filter((category) => category.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.slug || '';
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

function getProductSellerDisplay(product: WooProduct) {
  const storeName =
    product.sellerStoreName ||
    product.seller?.storeName ||
    ''

  const sellerKey =
    product.sellerKey ||
    product.seller?.key ||
    ''

  const sellerUrl =
    product.sellerUrl ||
    product.seller?.url ||
    (sellerKey ? `/seller/${encodeURIComponent(sellerKey)}` : '')

  return {
    storeName,
    sellerUrl,
    verified: Boolean(product.sellerVerified || product.seller?.verified),
  }
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

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    categorySlug: routeCategorySlug,
    collectionSlug,
  } = useParams<{
    categorySlug?: string;
    collectionSlug?: string;
  }>();

  const collection =
    collectionSlug
      ? COLLECTIONS[
          collectionSlug
        ]
      : undefined;

  const categorySlugFromUrl =
    routeCategorySlug ||
    searchParams.get(
      'category'
    );

  const searchFromUrl =
    searchParams.get('q') ||
    searchParams.get(
      'search'
    ) ||
    '';

  const sortFromUrl =
    parseSortOption(
      searchParams.get(
        'sort'
      ),
      collection?.sort ||
        'featured'
    );

  const legacyPriceBounds = getLegacyPriceBounds(searchParams.get('price'));
  const minPriceFromUrl =
    normalizePriceParameter(searchParams.get('min_price')) ||
    legacyPriceBounds.min;
  const maxPriceFromUrl =
    normalizePriceParameter(searchParams.get('max_price')) ||
    legacyPriceBounds.max;

  const storageFromUrl =
    searchParams.get(
      'storage'
    ) || '';

  const colorFromUrl =
    searchParams.get(
      'colour'
    ) ||
    searchParams.get(
      'color'
    ) ||
    '';

  const onSaleFromUrl =
    collection?.onSale ===
      true ||
    ['1', 'true'].includes(
      String(
        searchParams.get(
          'on_sale'
        ) || ''
      ).toLowerCase()
    );

  const pageFromUrl =
    Math.max(
      1,
      Number(
        searchParams.get(
          'page'
        ) || '1'
      ) || 1
    );

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>(sortFromUrl);
  const [appliedMinPrice, setAppliedMinPrice] = useState(minPriceFromUrl);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(maxPriceFromUrl);
  const [minimumPriceInput, setMinimumPriceInput] = useState(minPriceFromUrl);
  const [maximumPriceInput, setMaximumPriceInput] = useState(maxPriceFromUrl);
  const [priceFilterError, setPriceFilterError] = useState('');
  const [selectedStorage, setSelectedStorage] = useState(storageFromUrl);
  const [selectedColor, setSelectedColor] = useState(colorFromUrl);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const dismissMobileFilters = useBackButtonDismiss({
    id: 'shop-mobile-filters',
    isOpen: showMobileFilters,
    onDismiss: () => setShowMobileFilters(false),
  });
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState(searchFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { items: recentlyViewedItems, hasItems: hasRecentlyViewedItems } = useRecentlyViewed();
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const hasCompletedInitialPageSyncRef = useRef(false);
  const shouldRestoreShopScrollRef = useRef(false);
  const shouldScrollToResultsAfterPageChangeRef =
    useRef(false);
  const isApplyingUrlStateRef = useRef(false);
  const hasMountedRefinementSyncRef = useRef(false);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ['woo-categories'],
    queryFn: async () => {
      const items = await fetchWooCategories()

      return sortCategoriesForMarketplace(
        items.filter((category) => category.productCount > 0)
      )
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (
      searchFromUrl !==
      searchQuery
    ) {
      setSearchQuery(
        searchFromUrl
      );
    }

    if (
      searchFromUrl !==
      submittedSearchQuery
    ) {
      setSubmittedSearchQuery(
        searchFromUrl
      );
    }
  }, [searchFromUrl]);

  useEffect(() => {
    if (!categories.length) return;

    if (!categorySlugFromUrl) {
      setSelectedCategoryId(null);
      return;
    }

    const matchedCategory =
      categories.find(
        (category) =>
          category.slug ===
          categorySlugFromUrl
      );

    setSelectedCategoryId(
      matchedCategory?.id ||
        null
    );
  }, [
    categories,
    categorySlugFromUrl,
  ]);

  useEffect(() => {
    if (pageFromUrl !== page) {
      setPage(pageFromUrl);
    }
  }, [pageFromUrl]);

  useEffect(() => {
    const matchesUrl =
      sortBy === sortFromUrl &&
      appliedMinPrice === minPriceFromUrl &&
      appliedMaxPrice === maxPriceFromUrl &&
      selectedStorage ===
        storageFromUrl &&
      selectedColor ===
        colorFromUrl;

    if (matchesUrl) return;

    isApplyingUrlStateRef.current =
      true;

    setSortBy(sortFromUrl);

    setAppliedMinPrice(minPriceFromUrl);
    setAppliedMaxPrice(maxPriceFromUrl);
    setMinimumPriceInput(minPriceFromUrl);
    setMaximumPriceInput(maxPriceFromUrl);
    setPriceFilterError('');

    setSelectedStorage(
      storageFromUrl
    );

    setSelectedColor(
      colorFromUrl
    );
  }, [
    sortFromUrl,
    minPriceFromUrl,
    maxPriceFromUrl,
    storageFromUrl,
    colorFromUrl,
  ]);

  useEffect(() => {
    if (
      !hasMountedRefinementSyncRef.current
    ) {
      hasMountedRefinementSyncRef.current =
        true;

      return;
    }

    if (
      isApplyingUrlStateRef.current
    ) {
      isApplyingUrlStateRef.current =
        false;

      return;
    }

    const matchesUrl =
      sortBy === sortFromUrl &&
      appliedMinPrice === minPriceFromUrl &&
      appliedMaxPrice === maxPriceFromUrl &&
      selectedStorage ===
        storageFromUrl &&
      selectedColor ===
        colorFromUrl;

    if (matchesUrl) return;

    const params =
      new URLSearchParams(
        searchParams
      );

    const defaultSort =
      collection?.sort ||
      'featured';

    if (
      sortBy !== defaultSort
    ) {
      params.set(
        'sort',
        sortBy
      );
    } else {
      params.delete('sort');
    }

    params.delete('price');

    if (appliedMinPrice) {
      params.set('min_price', appliedMinPrice);
    } else {
      params.delete('min_price');
    }

    if (appliedMaxPrice) {
      params.set('max_price', appliedMaxPrice);
    } else {
      params.delete('max_price');
    }

    if (selectedStorage) {
      params.set(
        'storage',
        selectedStorage
      );
    } else {
      params.delete('storage');
    }

    if (selectedColor) {
      params.set(
        'colour',
        selectedColor
      );
    } else {
      params.delete('colour');
      params.delete('color');
    }

    params.delete('page');
    setPage(1);

    setSearchParams(
      params,
      {
        replace: true,
      }
    );
  }, [
    sortBy,
    appliedMinPrice,
    appliedMaxPrice,
    selectedStorage,
    selectedColor,
    sortFromUrl,
    minPriceFromUrl,
    maxPriceFromUrl,
    storageFromUrl,
    colorFromUrl,
    collection?.sort,
    searchParams,
    setSearchParams,
  ]);

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

  const {
    data: productsResponse,
    isLoading,
    isFetching,
    error: productsError,
  } = useQuery({
    queryKey: [
      'marketplace-products',
      PRODUCTS_PER_PAGE,
      page,
      submittedSearchQuery,
      categorySlugFromUrl,
      sortBy,
      appliedMinPrice,
      appliedMaxPrice,
      selectedStorage,
      selectedColor,
      onSaleFromUrl,
    ],
    queryFn: () =>
      fetchMarketplaceProducts({
        query: submittedSearchQuery,
        page,
        perPage: PRODUCTS_PER_PAGE,
        sort: sortBy,
        category: categorySlugFromUrl || undefined,
        storage: selectedStorage || undefined,
        colour: selectedColor || undefined,
        minPrice: appliedMinPrice ? Number(appliedMinPrice) : null,
        maxPrice: appliedMaxPrice ? Number(appliedMaxPrice) : null,
        onSale: onSaleFromUrl,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const products = productsResponse?.products || [];
  const totalProducts = productsResponse?.total || 0;
  const totalPages = productsResponse?.totalPages || 1;
  const marketplaceFacets = productsResponse?.facets;
  const loadError =
    productsError instanceof Error
      ? productsError.message
      : productsError
        ? 'We could not load products right now. Please try again.'
        : '';

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
  }, [
    searchQuery,
    selectedCategoryId,
    appliedMinPrice,
    appliedMaxPrice,
    selectedStorage,
    selectedColor,
    sortBy,
  ]);

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
    if (
      isFetching ||
      !shouldScrollToResultsAfterPageChangeRef.current
    ) {
      return;
    }

    shouldScrollToResultsAfterPageChangeRef.current = false;

    window.requestAnimationFrame(() => {
      const results =
        document.getElementById('shop-results');

      if (!results) return;

      const headerOffset =
        window.innerWidth >= 768 ? 138 : 104;

      const top =
        results.getBoundingClientRect().top +
        window.scrollY -
        headerOffset;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    });
  }, [isFetching, page, products.length]);

  useEffect(() => {
    if (!showMobileFilters) return;

    return acquireBodyScrollLock();
  }, [showMobileFilters]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const selectedCategorySlug = selectedCategory?.slug;
  const categoryFacetCounts = new Map(
    (marketplaceFacets?.categories || []).map(
      (option) => [option.value, option.count]
    )
  );
  const popularCategories = categories
    .map((category) => ({
      ...category,
      productCount:
        categoryFacetCounts.get(category.slug) ??
        category.productCount,
    }))
    .slice(0, 10);
  const availableStorageFilters =
    marketplaceFacets?.storage?.length
      ? marketplaceFacets.storage.map((option) => option.value)
      : STORAGE_FILTERS;
  const availableColorFilters =
    marketplaceFacets?.colours?.length
      ? marketplaceFacets.colours.map((option) => option.value)
      : COLOR_FILTERS;
  const activeSidebarFilterCount = [
    Boolean(appliedMinPrice || appliedMaxPrice),
    Boolean(selectedStorage),
    Boolean(selectedColor),
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    selectedCategoryId ||
      searchQuery.trim() ||
      activeSidebarFilterCount > 0
  );
  const customPriceLabel = getCustomPriceLabel(
    appliedMinPrice,
    appliedMaxPrice
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
    customPriceLabel
      ? {
          key: 'price',
          label: `Price: ${customPriceLabel}`,
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

  const relatedCategorySlug = useMemo(
    () =>
      categorySlugFromUrl ||
      getRelatedCategorySlug(submittedSearchQuery, categories),
    [categorySlugFromUrl, submittedSearchQuery, categories]
  );
  const shouldLoadRecommendations = Boolean(
    productsResponse &&
      !isLoading &&
      products.length === 0 &&
      (submittedSearchQuery.trim() || hasActiveFilters)
  );
  const {
    data: recommendationData,
    isLoading: recommendationsLoading,
  } = useQuery({
    queryKey: [
      'marketplace-no-result-recommendations',
      submittedSearchQuery,
      relatedCategorySlug,
    ],
    enabled: shouldLoadRecommendations,
    queryFn: async () => {
      if (relatedCategorySlug) {
        const relatedResponse = await fetchMarketplaceProducts({
          page: 1,
          perPage: 12,
          sort: 'trending',
          category: relatedCategorySlug,
        });

        if (relatedResponse.products.length > 0) {
          return {
            products: relatedResponse.products,
            categorySlug: relatedCategorySlug,
            kind: 'category' as const,
          };
        }
      }

      const popularResponse = await fetchMarketplaceProducts({
        page: 1,
        perPage: 12,
        sort: 'trending',
      });

      return {
        products: popularResponse.products,
        categorySlug: '',
        kind: 'popular' as const,
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
  const recommendedProducts = recommendationData?.products || [];
  const recommendationCategory = categories.find(
    (category) => category.slug === recommendationData?.categorySlug
  );

  const updateShopUrl = (
    categorySlug?: string | null,
    search?: string,
    nextPage = 1
  ) => {
    const params =
      new URLSearchParams(
        searchParams
      );

    if (!routeCategorySlug) {
      if (categorySlug) {
        params.set(
          'category',
          categorySlug
        );
      } else {
        params.delete(
          'category'
        );
      }
    } else {
      params.delete(
        'category'
      );
    }

    if (search?.trim()) {
      params.set(
        'q',
        search.trim()
      );
    } else {
      params.delete('q');
    }

    params.delete('search');

    if (nextPage > 1) {
      params.set(
        'page',
        String(nextPage)
      );
    } else {
      params.delete('page');
    }

    setSearchParams(params);
  };

  const saveSearchHistory = (value: string) => {
    saveMarketplaceSearch(value);
  };

  const submitShopSearch = (value = searchQuery) => {
    const cleanedValue =
      value.trim();

    setSearchQuery(
      cleanedValue
    );

    setSubmittedSearchQuery(
      cleanedValue
    );

    setPage(1);

    if (!cleanedValue) {
      navigate('/shop');
      return;
    }

    const params =
      new URLSearchParams(
        searchParams
      );

    params.set(
      'q',
      cleanedValue
    );

    params.delete('search');
    params.delete('page');

    const categorySlug =
      selectedCategorySlug ||
      categorySlugFromUrl;

    if (categorySlug) {
      params.set(
        'category',
        categorySlug
      );
    } else {
      params.delete(
        'category'
      );
    }

    if (
      sortBy !== 'featured'
    ) {
      params.set(
        'sort',
        sortBy
      );
    } else {
      params.delete('sort');
    }

    if (onSaleFromUrl) {
      params.set(
        'on_sale',
        'true'
      );
    }

    navigate(
      `/search?${params.toString()}`
    );

    saveSearchHistory(
      cleanedValue
    );
  };

  const handleAllProductsClick = () => {
    setSelectedCategoryId(null);
    setPage(1);

    const params =
      new URLSearchParams(
        searchParams
      );

    params.delete('category');
    params.delete('search');
    params.delete('page');

    if (searchQuery.trim()) {
      params.set(
        'q',
        searchQuery.trim()
      );
    } else {
      params.delete('q');
    }

    if (
      sortBy !== 'featured'
    ) {
      params.set(
        'sort',
        sortBy
      );
    } else {
      params.delete('sort');
    }

    if (onSaleFromUrl) {
      params.set(
        'on_sale',
        'true'
      );
    }

    const suffix =
      params.toString()
        ? `?${params.toString()}`
        : '';

    navigate(
      searchQuery.trim()
        ? `/search${suffix}`
        : `/shop${suffix}`
    );
  };

  const handleCategoryClick = (category: WooCategory) => {
    setSelectedCategoryId(
      category.id
    );

    setPage(1);

    const params =
      new URLSearchParams(
        searchParams
      );

    params.delete('category');
    params.delete('search');
    params.delete('page');

    if (searchQuery.trim()) {
      params.set(
        'q',
        searchQuery.trim()
      );
    } else {
      params.delete('q');
    }

    if (
      sortBy !== 'featured'
    ) {
      params.set(
        'sort',
        sortBy
      );
    } else {
      params.delete('sort');
    }

    if (onSaleFromUrl) {
      params.set(
        'on_sale',
        'true'
      );
    }

    const suffix =
      params.toString()
        ? `?${params.toString()}`
        : '';

    navigate(
      `/category/${encodeURIComponent(
        category.slug
      )}${suffix}`
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSubmittedSearchQuery('');
    setSelectedCategoryId(null);
    setSortBy('featured');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setMinimumPriceInput('');
    setMaximumPriceInput('');
    setPriceFilterError('');
    setSelectedStorage('');
    setSelectedColor('');
    setPage(1);
    dismissMobileFilters();
    navigate('/shop');
  };

  const clearSidebarFilters = () => {
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setMinimumPriceInput('');
    setMaximumPriceInput('');
    setPriceFilterError('');
    setSelectedStorage('');
    setSelectedColor('');
  };

  const applyCustomPriceRange = () => {
    const minimumValue = Number(minimumPriceInput || 0);
    const maximumValue = Number(maximumPriceInput || 0);

    if (
      minimumValue < 0 ||
      maximumValue < 0 ||
      !Number.isFinite(minimumValue) ||
      !Number.isFinite(maximumValue)
    ) {
      setPriceFilterError('Enter valid prices of K0 or more.');
      return false;
    }

    if (minimumValue > 0 && maximumValue > 0 && minimumValue > maximumValue) {
      setPriceFilterError('Minimum price cannot be higher than maximum price.');
      return false;
    }

    setAppliedMinPrice(normalizePriceParameter(minimumValue));
    setAppliedMaxPrice(normalizePriceParameter(maximumValue));
    setMinimumPriceInput(normalizePriceParameter(minimumValue));
    setMaximumPriceInput(normalizePriceParameter(maximumValue));
    setPriceFilterError('');

    return true;
  };

  const applyMobileFilters = () => {
    if (!applyCustomPriceRange()) return;

    dismissMobileFilters();

    window.setTimeout(() => {
      document
        .getElementById('shop-results')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const removeFilterChip = (key: string) => {
    if (key === 'category') {
      handleAllProductsClick();
      return;
    }

    if (key === 'search') {
      setSearchQuery('');
      setSubmittedSearchQuery('');
      setPage(1);

      const params =
        new URLSearchParams(
          searchParams
        );

      params.delete('q');
      params.delete('search');
      params.delete('page');

      let targetPath = '/shop';

      if (collectionSlug) {
        targetPath =
          `/collections/${encodeURIComponent(
            collectionSlug
          )}`;
      } else if (
        categorySlugFromUrl
      ) {
        params.delete(
          'category'
        );

        targetPath =
          `/category/${encodeURIComponent(
            categorySlugFromUrl
          )}`;
      }

      const suffix =
        params.toString()
          ? `?${params.toString()}`
          : '';

      navigate(
        `${targetPath}${suffix}`
      );

      return;
    }

    if (key === 'price') {
      setAppliedMinPrice('');
      setAppliedMaxPrice('');
      setMinimumPriceInput('');
      setMaximumPriceInput('');
      setPriceFilterError('');
      return;
    }

    if (key === 'storage') {
      setSelectedStorage('');
      return;
    }

    if (key === 'color') {
      setSelectedColor('');
    }
  };

  const sortedProducts = products;

  const formatPrice = (price: number) =>
    `K${safeNumber(price).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const goToShopPage = (nextPage: number) => {
    if (
      nextPage === page ||
      nextPage < 1 ||
      nextPage > totalPages ||
      isFetching
    ) {
      return;
    }

    shouldScrollToResultsAfterPageChangeRef.current =
      true;

    setPage(nextPage);

    updateShopUrl(
      selectedCategorySlug || categorySlugFromUrl,
      searchQuery,
      nextPage
    );
  };

  const goToPreviousPage = () => {
    goToShopPage(page - 1);
  };

  const goToNextPage = () => {
    goToShopPage(page + 1);
  };

  const goToPage = (nextPage: number) => {
    goToShopPage(nextPage);
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
        seller: product.seller,
        sellerStoreName: product.sellerStoreName || product.seller?.storeName || 'DigitalHood',
        sellerKey: product.sellerKey || product.seller?.key || 'digitalhood',
        sellerUrl: product.sellerUrl || product.seller?.url || '/seller/digitalhood',
        sellerVerified: Boolean(product.sellerVerified || product.seller?.verified || product.sellerKey === 'digitalhood'),
        sellerCustomerId: product.sellerCustomerId || product.seller?.customerId || '',
        sellerAvatarUrl: (product.sellerKey || product.seller?.key) === 'digitalhood' ? '/logo.jpg' : '',
        sellerFeedbackText: (product.sellerKey || product.seller?.key) === 'digitalhood' ? '100% positive' : 'New seller',
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

          <h2 className="font-display text-base font-black text-dh-primary sm:text-lg">
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
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-dh-primary">
                Your price range
              </h3>
              <p className="mt-1 text-xs text-dh-dark-gray">
                Enter any minimum or maximum.
              </p>
            </div>
            {customPriceLabel && (
              <span className="rounded-full bg-dh-secondary/15 px-2.5 py-1 text-[11px] font-black text-dh-primary">
                {customPriceLabel}
              </span>
            )}
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyCustomPriceRange();
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-dh-dark-gray">
                  Minimum
                </span>
                <span className="flex h-11 items-center rounded-xl border border-dh-light-gray bg-dh-gray px-3 focus-within:border-dh-primary focus-within:ring-2 focus-within:ring-dh-secondary/20">
                  <span className="mr-1.5 text-sm font-black text-dh-primary">K</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={minimumPriceInput}
                    onChange={(event) => {
                      setMinimumPriceInput(event.target.value);
                      setPriceFilterError('');
                    }}
                    placeholder="0"
                    aria-label="Minimum product price in kwacha"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-dh-primary outline-none placeholder:text-dh-dark-gray/60"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-dh-dark-gray">
                  Maximum
                </span>
                <span className="flex h-11 items-center rounded-xl border border-dh-light-gray bg-dh-gray px-3 focus-within:border-dh-primary focus-within:ring-2 focus-within:ring-dh-secondary/20">
                  <span className="mr-1.5 text-sm font-black text-dh-primary">K</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={maximumPriceInput}
                    onChange={(event) => {
                      setMaximumPriceInput(event.target.value);
                      setPriceFilterError('');
                    }}
                    placeholder="Any"
                    aria-label="Maximum product price in kwacha"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-dh-primary outline-none placeholder:text-dh-dark-gray/60"
                  />
                </span>
              </label>
            </div>

            {priceFilterError && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {priceFilterError}
              </p>
            )}

            {marketplaceFacets?.price.max && marketplaceFacets.price.max > 0 ? (
              <p className="text-[11px] font-semibold text-dh-dark-gray">
                Available here: {formatCompactPrice(String(marketplaceFacets.price.min || 0))}
                {' – '}
                {formatCompactPrice(String(marketplaceFacets.price.max))}
              </p>
            ) : null}

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center rounded-full bg-dh-primary px-4 text-sm font-black text-white transition-colors hover:bg-[#ffb54a] hover:text-dh-primary"
            >
              Apply price range
            </button>
          </form>
        </div>

        <div className="border-t border-dh-light-gray pt-5">
          <h3 className="mb-3 text-sm font-bold text-dh-primary">
            Storage
          </h3>

          <div className="flex flex-wrap gap-2">
            {availableStorageFilters.map((storage) => (
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
            {availableColorFilters.map((color) => (
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
    <div ref={pageRef} className="flex min-h-[100svh] flex-col overflow-x-hidden bg-gray-50">
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
                  onClick={dismissMobileFilters}
                  className="absolute inset-0 bg-black/40"
                />

                <aside className="absolute right-0 top-0 flex h-full w-[88vw] max-w-sm flex-col bg-dh-gray shadow-2xl">
                  <div className="flex items-center justify-between border-b border-dh-light-gray bg-white px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                        Refine results
                      </p>
                      <h2 className="font-display text-base font-black text-dh-primary sm:text-lg">
                        Product filters
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={dismissMobileFilters}
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

          <div id="shop-results" className="shop-content grid max-w-full gap-5 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
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
                    Filters and sorting are applied across the full marketplace catalogue.
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
                      <option value="trending">Trending</option>
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
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
              <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#07111f] via-[#102137] to-[#22354c] px-5 py-7 text-white sm:px-7 sm:py-9">
                  <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ffb54a]/20 blur-3xl" />
                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffb54a] text-[#07111f]">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#ffd18e]">
                        Keep discovering
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-black leading-tight sm:text-3xl">
                        {submittedSearchQuery.trim()
                          ? `No exact match for “${submittedSearchQuery.trim()}”`
                          : 'No products match these filters'}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-300">
                        We have not left you at a dead end. Try a broader search,
                        adjust your filters, or explore the closest marketplace
                        picks below.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-full bg-[#ffb54a] font-black text-[#07111f] hover:bg-[#ffd18e]"
                      >
                        View all products
                      </Button>
                      <Link
                        to="/categories"
                        className="inline-flex h-10 items-center rounded-full border border-white/25 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10"
                      >
                        Browse categories
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9a5b00]">
                        Recommended next
                      </p>
                      <h4 className="mt-1 font-display text-xl font-black text-dh-primary sm:text-2xl">
                        {recommendationCategory
                          ? `Explore ${recommendationCategory.name}`
                          : 'Popular marketplace finds'}
                      </h4>
                      <p className="mt-1 text-sm text-dh-dark-gray">
                        {recommendationData?.kind === 'category'
                          ? 'Related products from the closest matching category.'
                          : 'Products shoppers are exploring across the marketplace.'}
                      </p>
                    </div>

                    {recommendationCategory && (
                      <Link
                        to={`/category/${encodeURIComponent(recommendationCategory.slug)}`}
                        className="inline-flex items-center text-sm font-black text-dh-primary hover:text-[#9a5b00]"
                      >
                        View this category
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </div>

                  {recommendationsLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-2xl bg-dh-gray p-3">
                          <div className="aspect-[4/3] rounded-xl bg-slate-200" />
                          <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-200" />
                          <div className="mt-2 h-4 w-2/5 rounded-full bg-slate-200" />
                        </div>
                      ))}
                    </div>
                  ) : recommendedProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {recommendedProducts.slice(0, 10).map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.slug || product.id}`}
                          className="group overflow-hidden rounded-2xl border border-dh-light-gray bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-dh-primary/20 hover:shadow-lg"
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-dh-gray">
                            <img
                              src={getFastProductImage(product, 'card')}
                              srcSet={getFastProductSrcSet(product)}
                              sizes={getProductImageSizes('card')}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              onError={(event) =>
                                advanceProductImageFallback(
                                  event.currentTarget,
                                  product,
                                  'card'
                                )
                              }
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="px-1 pb-1 pt-3">
                            <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-dh-primary">
                              {product.name}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="font-display text-base font-black text-dh-primary">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-[11px] font-black text-[#9a5b00]">
                                View
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-dh-gray p-5">
                      <p className="text-sm font-black text-dh-primary">
                        Try one of these popular departments
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {popularCategories.slice(0, 8).map((category) => (
                          <Link
                            key={category.id}
                            to={`/category/${encodeURIComponent(category.slug)}`}
                            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-dh-primary shadow-sm transition hover:bg-dh-primary hover:text-white"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <>
                <div
                  className={`grid ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'grid-cols-1 gap-4'
                  }`}
                >
                  {sortedProducts.map((product) => {
                    const soldText = getSoldText(product);
                    const ratingText = getRatingText(product);
                    const sellerDisplay = getProductSellerDisplay(product);
                    const shouldViewOptions =
                      product.hasOptions || product.type === 'variable';
                    const canBuyDirectly = !shouldViewOptions && product.canAddToCart;

                    return (
                      <div
                        key={product.id}
                        className={`group overflow-hidden rounded-2xl border border-transparent bg-white shadow-sm transition-all duration-300 hover:border-dh-primary/15 hover:shadow-lg ${
                          viewMode === 'list'
                            ? 'flex flex-col min-h-[220px] items-stretch hover:-translate-y-0 sm:flex-row'
                            : 'hover:-translate-y-1'
                        }`}
                      >
                        <div
                          className={`relative overflow-hidden bg-gray-100 ${
                            viewMode === 'list'
                              ? 'aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:w-48 lg:w-60'
                              : 'aspect-[4/3]'
                          }`}
                        >
                          <Link to={`/product/${product.slug}`}>
                            <img
                              src={getOptimizedImageUrl(product.image, 'card')}
                              srcSet={getImageSrcSet(product.image, 'card')}
                              sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw"
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src = '/logo.jpg';
                              }}
                            />
                          </Link>

                          <div className="absolute right-2 top-2 flex flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => toggleWishlist(product as any)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:scale-110 ${
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
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-all hover:scale-110 hover:text-dh-primary"
                              aria-label={`View ${product.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>

                        <div
                          className={`flex flex-1 flex-col p-3 sm:p-4 ${
                            viewMode === 'list'
                              ? 'sm:p-5 lg:grid lg:grid-cols-[1fr_240px] lg:items-center lg:gap-6'
                              : ''
                          }`}
                        >
                          <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-1 text-xs text-dh-dark-gray">
                            <Star className="h-4 w-4 fill-[#ffb54a] text-[#ffb54a]" />
                            <span className="font-medium">{ratingText}</span>
                          </div>

                          <Link to={`/product/${product.slug}`}>
                            <h3 className="mb-2 line-clamp-2 min-h-[2.4rem] text-sm font-black leading-5 text-dh-primary transition-colors hover:text-[#ffb54a]">
                              {product.name}
                            </h3>
                          </Link>

                          {sellerDisplay.storeName && (
                            <Link
                              to={sellerDisplay.sellerUrl || '/seller/digitalhood'}
                              className="mb-2 inline-flex max-w-full items-center gap-1 text-[11px] font-bold text-dh-dark-gray transition-colors hover:text-dh-primary"
                              onClick={saveShopReturnState}
                            >
                              <span className="truncate">
                                Sold by <span className="text-dh-primary">{sellerDisplay.storeName}</span>
                              </span>
                              {sellerDisplay.verified && (
                                <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-black text-green-700">
                                  Verified
                                </span>
                              )}
                            </Link>
                          )}

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
                                ? 'rounded-2xl bg-dh-gray p-4 lg:mt-0'
                                : ''
                            }`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="font-display text-base font-black text-dh-primary sm:text-lg">
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
                              src={getFastProductImage(item, 'card')}
                              srcSet={getFastProductSrcSet(item)}
                              sizes="(min-width: 1024px) 240px, 50vw"
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(event) => {
                                advanceProductImageFallback(
                                  event.currentTarget,
                                  item,
                                  'card'
                                );
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

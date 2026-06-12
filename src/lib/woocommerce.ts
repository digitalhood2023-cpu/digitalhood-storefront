const STORE_URL =
  import.meta.env.VITE_WOOCOMMERCE_STORE_URL || `https://${'digitalhood'}.info`;

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info';

const STORE_PRODUCTS_API = `${STORE_URL}/wp-json/wc/store/v1/products`;
const STORE_CATEGORIES_API = `${STORE_URL}/wp-json/wc/store/v1/products/categories`;

const MARKETPLACE_PRODUCTS_API = `${PAYMENTS_API_URL}/api/products`;

export type MarketplaceStockTone = 'success' | 'warning' | 'danger' | 'muted';

export type WooProductAttribute = {
  id: number;
  name: string;
  taxonomy: string | null;
  options: string[];
};

export type WooProductVariation = {
  id: number;
  parentId: number;
  name: string;
  price: number;
  priceHtml: string;
  image: string;
  inStock: boolean;
  purchasable: boolean;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  stockLabel: string;
  stockTone: MarketplaceStockTone;
  canAddToCart: boolean;
  attributes: Record<string, string>;

  // Snake_case fields kept for shared stock helpers/cart compatibility
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  stock_label?: string;
  stock_tone?: MarketplaceStockTone;
  can_add_to_cart?: boolean;
};

export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  type: string;
  permalink: string;
  price: number;
  priceHtml: string;
  image: string;
  images: string[];
  description: string;
  descriptionHtml: string;
  shortDescription: string;
  shortDescriptionHtml: string;
  inStock: boolean;
  purchasable: boolean;
  hasOptions: boolean;
  addToCartText: string;

  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  stockLabel: string;
  stockTone: MarketplaceStockTone;
  canAddToCart: boolean;

  totalSales: number;
  averageRating: number;
  ratingCount: number;
  reviewCount: number;

  seller?: {
    id?: string;
    customerId?: string | number;
    storeName?: string;
    key?: string;
    url?: string;
    verified?: boolean;
    avatarUrl?: string;
    profilePhotoUrl?: string;
    logoUrl?: string;
  } | null;
  sellerStoreName?: string;
  sellerKey?: string;
  sellerUrl?: string;
  sellerVerified?: boolean;
  sellerCustomerId?: string | number;
  sellerAvatarUrl?: string;
  sellerProfilePhotoUrl?: string;

  categoryIds: number[];
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  attributes: WooProductAttribute[];
  variations: WooProductVariation[];

  // Snake_case fields kept for shared stock helpers/cart compatibility
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  stock_label?: string;
  stock_tone?: MarketplaceStockTone;
  can_add_to_cart?: boolean;
  total_sales?: number;
  average_rating?: string;
  rating_count?: number;
  review_count?: number;
};

export type WooCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  image: string;
};

export type WooProductsResponse = {
  products: WooProduct[];
  total: number;
  totalPages: number;
};

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Server returned non-JSON response. Status: ${
        response.status
      }. Response started with: ${text.slice(0, 120)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.details ||
        data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

function getPrice(item: any): number {
  if (item?.price !== undefined && item?.price !== null && item?.price !== '') {
    const directPrice = Number(item.price);
    return Number.isNaN(directPrice) ? 0 : directPrice;
  }

  const rawPrice = Number(item?.prices?.price || 0);
  const minorUnit = Number(item?.prices?.currency_minor_unit || 2);

  if (Number.isNaN(rawPrice)) {
    return 0;
  }

  return rawPrice / Math.pow(10, minorUnit);
}

function getImageSrc(image: any): string {
  if (!image) return '/logo.jpg';

  if (typeof image === 'string') return image;

  return image.src || image.url || '/logo.jpg';
}

function getImages(item: any): string[] {
  if (!Array.isArray(item?.images)) {
    return item?.image ? [getImageSrc(item.image)] : ['/logo.jpg'];
  }

  const images = item.images.map(getImageSrc).filter(Boolean);

  return images.length > 0 ? images : ['/logo.jpg'];
}

function normalizeAttributeName(name = '') {
  return name
    .replace(/^pa_/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeTone(tone?: string): MarketplaceStockTone {
  if (
    tone === 'success' ||
    tone === 'warning' ||
    tone === 'danger' ||
    tone === 'muted'
  ) {
    return tone;
  }

  return 'muted';
}

function getStockStatus(item: any): string {
  return (
    item?.stock_status ||
    item?.stockStatus ||
    (item?.is_in_stock === false ? 'outofstock' : 'instock')
  );
}

function getStockQuantity(item: any): number | null {
  const value = item?.stock_quantity ?? item?.stockQuantity;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const quantity = Number(value);

  return Number.isNaN(quantity) ? null : quantity;
}

function getManageStock(item: any): boolean {
  return Boolean(item?.manage_stock ?? item?.manageStock ?? false);
}

function getPurchasable(item: any): boolean {
  if (item?.purchasable !== undefined) return Boolean(item.purchasable);
  if (item?.is_purchasable !== undefined) return Boolean(item.is_purchasable);
  return true;
}

function getMarketplaceStockLabel(item: any): {
  label: string;
  tone: MarketplaceStockTone;
  canAddToCart: boolean;
} {
  if (!item) {
    return {
      label: 'Unavailable',
      tone: 'muted',
      canAddToCart: false,
    };
  }

  if (item.stock_label || item.stockLabel) {
    return {
      label: item.stock_label || item.stockLabel,
      tone: normalizeTone(item.stock_tone || item.stockTone),
      canAddToCart: item.can_add_to_cart ?? item.canAddToCart ?? true,
    };
  }

  const stockStatus = getStockStatus(item);
  const stockQuantity = getStockQuantity(item);
  const manageStock = getManageStock(item);
  const purchasable = getPurchasable(item);

  if (!purchasable) {
    return {
      label: 'Unavailable',
      tone: 'muted',
      canAddToCart: false,
    };
  }

  if (stockStatus === 'outofstock') {
    return {
      label: 'Out of stock',
      tone: 'danger',
      canAddToCart: false,
    };
  }

  if (stockStatus === 'onbackorder') {
    return {
      label: 'Available on backorder',
      tone: 'warning',
      canAddToCart: true,
    };
  }

  if (manageStock && stockQuantity !== null) {
    if (stockQuantity <= 0) {
      return {
        label: 'Out of stock',
        tone: 'danger',
        canAddToCart: false,
      };
    }

    if (stockQuantity <= 3) {
      return {
        label: `Almost sold out - ${stockQuantity} left`,
        tone: 'warning',
        canAddToCart: true,
      };
    }

    if (stockQuantity <= 10) {
      return {
        label: `Only ${stockQuantity} left`,
        tone: 'warning',
        canAddToCart: true,
      };
    }
  }

  return {
    label: 'In stock',
    tone: 'success',
    canAddToCart: true,
  };
}

function mapWooAttributes(product: any): WooProductAttribute[] {
  const rawAttributes = product.attributes || [];

  return rawAttributes
    .map((attribute: any) => {
      const options =
        attribute.terms?.map((term: any) => term.name) ||
        attribute.options ||
        [];

      return {
        id: attribute.id || 0,
        name: normalizeAttributeName(attribute.name || attribute.taxonomy || ''),
        taxonomy: attribute.taxonomy || attribute.name || null,
        options,
      };
    })
    .filter((attribute: WooProductAttribute) => attribute.options.length > 0);
}

function mapVariationAttributes(variation: any): Record<string, string> {
  const attributes: Record<string, string> = {};

  const rawAttributes = variation.attributes || [];

  rawAttributes.forEach((attribute: any) => {
    const key = normalizeAttributeName(
      attribute.name || attribute.taxonomy || attribute.attribute || ''
    );

    const value =
      attribute.value ||
      attribute.term ||
      attribute.option ||
      attribute.name ||
      '';

    if (key && value) {
      attributes[key] = value;
    }
  });

  return attributes;
}

function mapCategories(product: any) {
  return (
    product.categories?.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })) || []
  );
}

export function mapWooVariation(variation: any): WooProductVariation {
  const stockStatus = getStockStatus(variation);
  const stockQuantity = getStockQuantity(variation);
  const manageStock = getManageStock(variation);
  const purchasable = getPurchasable(variation);
  const stock = getMarketplaceStockLabel(variation);
  const image = getImageSrc(variation.image || variation.images?.[0]);

  return {
    id: variation.id,
    parentId: variation.parent || variation.parent_id || variation.parentId || 0,
    name: variation.name || '',
    price: getPrice(variation),
    priceHtml: variation.price_html || variation.priceHtml || '',
    image,
    inStock: stockStatus !== 'outofstock',
    purchasable,
    stockStatus,
    stockQuantity,
    manageStock,
    stockLabel: stock.label,
    stockTone: stock.tone,
    canAddToCart: stock.canAddToCart,
    attributes: Array.isArray(variation.attributes)
      ? mapVariationAttributes(variation)
      : variation.attributes || {},

    stock_status: stockStatus,
    stock_quantity: stockQuantity,
    manage_stock: manageStock,
    stock_label: stock.label,
    stock_tone: stock.tone,
    can_add_to_cart: stock.canAddToCart,
  };
}

export function mapWooProduct(product: any): WooProduct {
  const categories = mapCategories(product);
  const images = getImages(product);
  const stockStatus = getStockStatus(product);
  const stockQuantity = getStockQuantity(product);
  const manageStock = getManageStock(product);
  const purchasable = getPurchasable(product);
  const stock = getMarketplaceStockLabel(product);

  const type = product.type || 'simple';
  const variations = Array.isArray(product.variations)
    ? product.variations.map((variation: any) =>
        typeof variation === 'object'
          ? mapWooVariation(variation)
          : variation
      )
    : [];

  const hasOptions =
    Boolean(product.has_options) ||
    Boolean(product.hasOptions) ||
    type === 'variable' ||
    variations.length > 0;

  const averageRating = Number(
    product.average_rating || product.averageRating || 0
  );

  const ratingCount = Number(
    product.rating_count || product.ratingCount || product.review_count || 0
  );

  const totalSales = Number(product.total_sales || product.totalSales || 0);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type,
    permalink: product.permalink || '',
    price: getPrice(product),
    priceHtml: product.price_html || product.priceHtml || '',
    image: images[0] || '/logo.jpg',
    images,
    description: stripHtml(product.description),
descriptionHtml: product.description || product.descriptionHtml || '',
shortDescription: stripHtml(product.short_description || product.shortDescription),
shortDescriptionHtml:
  product.short_description ||
  product.shortDescriptionHtml ||
  product.shortDescription ||
  '',
    inStock: stockStatus !== 'outofstock',
    purchasable,
    hasOptions,
    addToCartText: product.add_to_cart?.text || product.addToCartText || 'View product',

    stockStatus,
    stockQuantity,
    manageStock,
    stockLabel: stock.label,
    stockTone: stock.tone,
    canAddToCart: stock.canAddToCart,

    totalSales,
    averageRating,
    ratingCount,
    reviewCount: Number(product.review_count || product.reviewCount || ratingCount),

    categoryIds: categories.map((category: any) => category.id),
    categories,
    attributes: mapWooAttributes(product),
    variations: variations.filter(
      (variation: any) => typeof variation === 'object'
    ) as WooProductVariation[],

    stock_status: stockStatus,
    stock_quantity: stockQuantity,
    manage_stock: manageStock,
    stock_label: stock.label,
    stock_tone: stock.tone,
    can_add_to_cart: stock.canAddToCart,
    total_sales: totalSales,
    average_rating: String(averageRating || 0),
    rating_count: ratingCount,
    review_count: Number(product.review_count || product.reviewCount || ratingCount),
    seller: product.seller || null,
    sellerStoreName: product.sellerStoreName || product.seller_store_name || product.seller?.storeName || '',
    sellerKey: product.sellerKey || product.seller_key || product.seller?.key || '',
    sellerUrl: product.sellerUrl || product.seller_url || product.seller?.url || '',
    sellerVerified: Boolean(product.sellerVerified || product.seller_verified || product.seller?.verified),
    sellerCustomerId: product.sellerCustomerId || product.seller_customer_id || product.seller?.customerId || '',
    sellerAvatarUrl:
      product.sellerAvatarUrl ||
      product.seller_avatar_url ||
      product.sellerProfilePhotoUrl ||
      product.seller_profile_photo_url ||
      product.seller?.avatarUrl ||
      product.seller?.profilePhotoUrl ||
      product.seller?.logoUrl ||
      '',
    sellerProfilePhotoUrl:
      product.sellerProfilePhotoUrl ||
      product.seller_profile_photo_url ||
      product.seller?.profilePhotoUrl ||
      '',
  };
}

export function mapWooCategory(category: any): WooCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: stripHtml(category.description),
    productCount: category.count || category.productCount || 0,
    image: category.image?.src || category.image || '/logo.jpg',
  };
}

export async function fetchWooProducts(
  limit = 24,
  page = 1,
  search = '',
  categoryId?: number | null
): Promise<WooProductsResponse> {
  const params = new URLSearchParams({
    per_page: String(limit),
    page: String(page),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (categoryId) {
    params.set('category', String(categoryId));
  }

  const response = await fetch(`${MARKETPLACE_PRODUCTS_API}?${params.toString()}`);
  const data = await parseJsonResponse(response);

  const rawProducts = Array.isArray(data.products) ? data.products : [];

  return {
    products: rawProducts.map(mapWooProduct),
    total: Number(data.total || rawProducts.length),
    totalPages: Number(data.totalPages || 1),
  };
}

export async function fetchWooProductVariations(
  productId: number
): Promise<WooProductVariation[]> {
  const response = await fetch(`${MARKETPLACE_PRODUCTS_API}/${productId}/variations`);
  const data = await parseJsonResponse(response);

  const variations = Array.isArray(data.variations) ? data.variations : [];

  return variations.map(mapWooVariation);
}

export async function fetchWooProductById(
  productId: number
): Promise<WooProduct | null> {
  if (!productId) return null;

  const detailResponse = await fetch(`${MARKETPLACE_PRODUCTS_API}/${productId}`);
  const detailData = await parseJsonResponse(detailResponse);

  const foundProduct = detailData.product || detailData;

  if (!foundProduct || !foundProduct.id) {
    return null;
  }

  const product = mapWooProduct(foundProduct);

  const variations = Array.isArray(detailData.variations)
    ? detailData.variations.map(mapWooVariation)
    : [];

  return {
    ...product,
    variations,
    hasOptions: product.hasOptions || product.type === 'variable' || variations.length > 0,
  };
}

export async function fetchWooProductBySlug(
  slug: string
): Promise<WooProduct | null> {
  const numericProductId = Number(slug);

  if (Number.isFinite(numericProductId) && numericProductId > 0) {
    return fetchWooProductById(numericProductId);
  }

  const params = new URLSearchParams({
    slug,
    per_page: '1',
  });

  const listResponse = await fetch(`${MARKETPLACE_PRODUCTS_API}?${params.toString()}`);
  const listData = await parseJsonResponse(listResponse);

  const foundProduct = Array.isArray(listData.products)
    ? listData.products[0]
    : null;

  if (!foundProduct) {
    return null;
  }

  return fetchWooProductById(Number(foundProduct.id));
}

export async function fetchWooCategories(): Promise<WooCategory[]> {
  const params = new URLSearchParams({
    per_page: '100',
  });

  const response = await fetch(`${STORE_CATEGORIES_API}?${params.toString()}`);
  const categories = await parseJsonResponse(response);

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map(mapWooCategory)
    .filter((category: WooCategory) => category.productCount > 0);
}

// Optional fallback helper in case you need direct Store API products later.
export async function fetchWooProductsDirectFromStoreApi(
  limit = 24,
  page = 1,
  search = '',
  categoryId?: number | null
): Promise<WooProductsResponse> {
  const params = new URLSearchParams({
    per_page: String(limit),
    page: String(page),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (categoryId) {
    params.set('category', String(categoryId));
  }

  const response = await fetch(`${STORE_PRODUCTS_API}?${params.toString()}`);
  const products = await parseJsonResponse(response);

  if (!Array.isArray(products)) {
    return {
      products: [],
      total: 0,
      totalPages: 1,
    };
  }

  return {
    products: products.map(mapWooProduct),
    total: Number(response.headers.get('X-WP-Total') || products.length),
    totalPages: Number(response.headers.get('X-WP-TotalPages') || 1),
  };
}

export type SearchSuggestionProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string | number;
  regular_price: string;
  sale_price: string;
  image: string;
  stock_status: string;
  stock_label: string;
  stock_tone: MarketplaceStockTone;
  can_add_to_cart: boolean;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

export type SearchSuggestionsResponse = {
  success: boolean;
  query: string;
  correctedQuery: string;
  didYouMean: string;
  suggestions: SearchSuggestionProduct[];
};

export async function fetchSearchSuggestions(
  query: string,
  limit = 8
): Promise<SearchSuggestionsResponse> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });

  const response = await fetch(`${PAYMENTS_API_URL}/api/search/suggestions?${params.toString()}`);
  const data = await parseJsonResponse(response);

  return {
    success: Boolean(data.success),
    query: data.query || query,
    correctedQuery: data.correctedQuery || '',
    didYouMean: data.didYouMean || '',
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}

export async function searchProductsByImage(
  imageFile: File,
  hint = ''
): Promise<SearchSuggestionsResponse & { imageSearchMode?: string; message?: string }> {
  const formData = new FormData();

  formData.append('image', imageFile);
  if (hint.trim()) {
    formData.append('hint', hint.trim());
  }

  const response = await fetch(`${PAYMENTS_API_URL}/api/search/image`, {
    method: 'POST',
    body: formData,
  });

  const data = await parseJsonResponse(response);

  return {
    success: Boolean(data.success),
    query: data.query || hint,
    correctedQuery: data.correctedQuery || '',
    didYouMean: data.didYouMean || '',
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    imageSearchMode: data.imageSearchMode || '',
    message: data.message || '',
  };
}

const STORE_URL =
  import.meta.env.VITE_WOOCOMMERCE_STORE_URL || 'https://digitalhood.info';

const PRODUCTS_API = `${STORE_URL}/wp-json/wc/store/v1/products`;
const CATEGORIES_API = `${STORE_URL}/wp-json/wc/store/v1/products/categories`;

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
  attributes: Record<string, string>;
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
  shortDescription: string;
  inStock: boolean;
  hasOptions: boolean;
  addToCartText: string;
  categoryIds: number[];
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  attributes: WooProductAttribute[];
  variations: WooProductVariation[];
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

function getPrice(product: any) {
  const rawPrice = Number(product.prices?.price || 0);
  const minorUnit = Number(product.prices?.currency_minor_unit || 2);

  return rawPrice / Math.pow(10, minorUnit);
}

function normalizeAttributeName(name = '') {
  return name
    .replace(/^pa_/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function mapVariationAttributes(variation: any) {
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

export function mapWooVariation(variation: any): WooProductVariation {
  return {
    id: variation.id,
    parentId: variation.parent || variation.parent_id || 0,
    name: variation.name || '',
    price: getPrice(variation),
    priceHtml: variation.price_html || '',
    image: variation.image?.src || variation.images?.[0]?.src || '/logo.jpg',
    inStock: variation.is_in_stock ?? variation.is_purchasable ?? true,
    attributes: mapVariationAttributes(variation),
  };
}

export function mapWooProduct(product: any): WooProduct {
  const categories =
    product.categories?.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })) || [];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: product.type,
    permalink: product.permalink,
    price: getPrice(product),
    priceHtml: product.price_html || '',
    image: product.images?.[0]?.src || '/logo.jpg',
    images: product.images?.map((image: any) => image.src) || [],
    description: stripHtml(product.description),
    shortDescription: stripHtml(product.short_description),
    inStock: product.is_in_stock,
    hasOptions: product.has_options,
    addToCartText: product.add_to_cart?.text || 'View product',
    categoryIds: categories.map((category: any) => category.id),
    categories,
    attributes: mapWooAttributes(product),
    variations: [],
  };
}

export function mapWooCategory(category: any): WooCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: stripHtml(category.description),
    productCount: category.count || 0,
    image: category.image?.src || '/logo.jpg',
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

  const response = await fetch(`${PRODUCTS_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`WooCommerce products failed: ${response.status}`);
  }

  const products = await response.json();

  return {
    products: products.map(mapWooProduct),
    total: Number(response.headers.get('X-WP-Total') || products.length),
    totalPages: Number(response.headers.get('X-WP-TotalPages') || 1),
  };
}

export async function fetchWooProductVariations(
  productId: number
): Promise<WooProductVariation[]> {
  const response = await fetch(`${PRODUCTS_API}/${productId}/variations`);

  if (!response.ok) {
    console.warn(`WooCommerce variations failed: ${response.status}`);
    return [];
  }

  const variations = await response.json();

  if (!Array.isArray(variations)) {
    return [];
  }

  return variations.map(mapWooVariation);
}

export async function fetchWooProductBySlug(
  slug: string
): Promise<WooProduct | null> {
  const params = new URLSearchParams({
    slug,
    per_page: '1',
  });

  const response = await fetch(`${PRODUCTS_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`WooCommerce product failed: ${response.status}`);
  }

  const products = await response.json();

  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  const product = mapWooProduct(products[0]);

  if (product.type === 'variable' || product.hasOptions) {
    product.variations = await fetchWooProductVariations(product.id);
  }

  return product;
}

export async function fetchWooCategories(): Promise<WooCategory[]> {
  const params = new URLSearchParams({
    per_page: '100',
  });

  const response = await fetch(`${CATEGORIES_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`WooCommerce categories failed: ${response.status}`);
  }

  const categories = await response.json();

  return categories
    .map(mapWooCategory)
    .filter((category: WooCategory) => category.productCount > 0);
}
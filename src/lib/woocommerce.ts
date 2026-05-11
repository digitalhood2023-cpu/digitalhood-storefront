const STORE_URL =
  import.meta.env.VITE_WOOCOMMERCE_STORE_URL || 'https://digitalhood.info';

const PRODUCTS_API = `${STORE_URL}/wp-json/wc/store/v1/products`;

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
};

export type WooProductsResponse = {
  products: WooProduct[];
  total: number;
  totalPages: number;
};

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function mapWooProduct(product: any): WooProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: product.type,
    permalink: product.permalink,
    price: product.prices?.price ? Number(product.prices.price) / 100 : 0,
    priceHtml: product.price_html,
    image: product.images?.[0]?.src || '/logo.jpg',
    images: product.images?.map((image: any) => image.src) || [],
    description: stripHtml(product.description),
    shortDescription: stripHtml(product.short_description),
    inStock: product.is_in_stock,
    hasOptions: product.has_options,
    addToCartText: product.add_to_cart?.text || 'View product',
  };
}

export async function fetchWooProducts(
  limit = 24,
  page = 1,
  search = ''
): Promise<WooProductsResponse> {
  const params = new URLSearchParams({
    per_page: String(limit),
    page: String(page),
  });

  if (search.trim()) {
    params.set('search', search.trim());
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
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

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function formatPrice(product: any) {
  const rawPrice = product.prices?.price;

  if (!rawPrice) return 'Price unavailable';

  const amount = Number(rawPrice) / 100;
  const symbol = product.prices?.currency_symbol || 'K';

  return `${symbol}${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export async function fetchWooProducts(limit = 20): Promise<WooProduct[]> {
  const response = await fetch(`${PRODUCTS_API}?per_page=${limit}`);

  if (!response.ok) {
    throw new Error(`WooCommerce products failed: ${response.status}`);
  }

  const products = await response.json();

  return products.map(mapWooProduct);
}

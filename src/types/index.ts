export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  category: string;
  inStock: boolean;
  stockCount?: number;
  badge?: string;
  description?: string;
  features?: string[];
  sku?: string;
  brand?: string;
  condition?: 'new' | 'refurbished' | 'open-box';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  addresses?: Address[];
}

export interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  province: string;
  phone: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  trackingNumber?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  text: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  link: string;
}

export interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  rating: number | null;
  condition: string[];
  shipping: string[];
  inStock: boolean;
  onSale: boolean;
}

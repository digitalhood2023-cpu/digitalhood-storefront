import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Check,
  Clock,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  Shield,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';

import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  fetchWooProductBySlug,
  type WooProduct,
} from '@/lib/woocommerce';

import { getShippingDetails } from '@/lib/shipping';
import { useAddToCart } from '@/hooks/useCart';

import gsap from 'gsap';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<WooProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('description');

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const addToCart = useAddToCart();

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;

    setIsLoading(true);
    setLoadError('');
    setSelectedImage(0);

    fetchWooProductBySlug(slug)
      .then((item) => {
        if (!item) {
          setLoadError('Product not found.');
          setProduct(null);
          return;
        }

        setProduct(item);
        window.scrollTo(0, 0);
      })
      .catch((error) => {
        console.error(error);
        setLoadError('We could not load this product right now.');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.product-image',
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }
      );

      gsap.fromTo(
        '.product-info',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out', delay: 0.15 }
      );
    }, pageRef);

    return () => ctx.revert();
  }, [product]);

  const formatPrice = (price: number) =>
    `K${price.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const productImages =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ['/logo.jpg'];

  const shipping = getShippingDetails({
    subtotal: product?.price || 0,
    city: 'Lusaka',
    province: 'Lusaka',
  });

  const handleAddToCart = () => {
    if (!product) return;

    addToCart.mutate(
      {
        productId: Number(product.id),
        quantity,
      },
      {
        onSuccess: () => {
          setAdded(true);

          setTimeout(() => {
            setAdded(false);
          }, 2000);
        },
      }
    );
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-white overflow-x-hidden">
      <Header />

      <main className="pt-6 pb-16 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap min-w-0">
            <Link to="/" className="hover:text-black transition-colors shrink-0">
              Home
            </Link>

            <ChevronRight className="w-4 h-4 shrink-0" />

            <Link to="/shop" className="hover:text-black transition-colors shrink-0">
              Shop
            </Link>

            {product?.categories?.[0] && (
              <>
                <ChevronRight className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {product.categories[0].name}
                </span>
              </>
            )}

            {product && (
              <>
                <ChevronRight className="w-4 h-4 shrink-0" />
                <span className="text-black truncate max-w-[160px] sm:max-w-[320px]">
                  {product.name}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-2xl" />

              <div>
                <div className="h-8 bg-gray-100 rounded mb-4" />
                <div className="h-6 bg-gray-100 rounded w-1/2 mb-6" />
                <div className="h-24 bg-gray-100 rounded mb-6" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            </div>
          ) : loadError || !product ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
              <h1 className="text-2xl font-bold text-black mb-3">
                Product unavailable
              </h1>

              <p className="text-gray-500 mb-6">
                {loadError || 'This product could not be found.'}
              </p>

              <Link to="/shop">
                <Button className="bg-black text-white hover:bg-[#ffb54a] hover:text-black">
                  Back to Shop
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 min-w-0">
              <div className="product-image min-w-0">
                <div className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                  <img
                    src={productImages[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain sm:object-cover"
                  />

                  <Badge className="absolute top-4 left-4 bg-black text-white font-semibold">
                    {product.inStock ? 'In stock' : 'Out of stock'}
                  </Badge>
                </div>

                {productImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
                    {productImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        onClick={() => setSelectedImage(index)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                          selectedImage === index
                            ? 'border-black'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="product-info min-w-0">
                <div className="mb-4">
                  <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-black mb-3 leading-tight break-words">
                    {product.name}
                  </h1>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 shrink-0">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className="w-5 h-5 fill-[#ffb54a] text-[#ffb54a]"
                        />
                      ))}
                    </div>

                    <span className="text-gray-600 text-sm">
                      Live WooCommerce product
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <span className="font-display font-bold text-3xl lg:text-4xl text-black">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <div className="mb-6 overflow-hidden rounded-2xl border border-green-100 bg-green-50">
                  <div className="flex animate-[pulse_3s_ease-in-out_infinite] flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Truck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                      <div>
                        <p className="font-semibold text-green-800">
                          {shipping.title}:{' '}
                          {shipping.fee === 0 ? 'Free' : formatPrice(shipping.fee)}
                        </p>
                        <p className="text-sm text-green-700">
                          {shipping.estimate}
                        </p>
                      </div>
                    </div>

                    {shipping.isLusaka && (
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                        <p className="text-sm font-medium text-green-800">
                          {shipping.countdown}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-green-700">
                      Final delivery fee updates at checkout based on your city and province.
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed break-words">
                  {product.shortDescription ||
                    product.description ||
                    'This product is available from DigitalHood.'}
                </p>

                <div className="flex flex-wrap gap-2 mb-6 min-w-0">
                  {product.categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="rounded-full max-w-full truncate"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() =>
                      setQuantity((prev) => Math.max(1, prev - 1))
                    }
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="w-14 h-10 rounded-lg border border-gray-300 flex items-center justify-center font-semibold">
                    {quantity}
                  </div>

                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mb-8 w-full">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!product.inStock || addToCart.isPending}
                    className="w-full sm:w-auto sm:min-w-[220px] h-12 rounded-xl bg-black hover:bg-[#ffb54a] hover:text-black text-white font-semibold"
                  >
                    {added ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                      </>
                    )}
                  </Button>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-black"
                    >
                      <Heart className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="outline"
                      className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-black"
                      onClick={() =>
                        navigator.share?.({
                          title: product.name,
                          url: window.location.href,
                        })
                      }
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-8">
                  <div className="flex items-center gap-3 min-w-0">
                    <Truck className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm">Delivery in Zambia</span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm">Secure checkout</span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <RotateCcw className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm">Seller support</span>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3 overflow-hidden">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="trust">Trust</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="mt-4">
                    <p className="text-gray-600 leading-relaxed break-words">
                      {product.description ||
                        product.shortDescription ||
                        'Product details are managed from WooCommerce.'}
                    </p>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                        <span className="text-gray-600">Product type</span>
                        <span className="font-medium capitalize text-right break-words">
                          {product.type}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 py-2 border-b border-gray-200">
                        <span className="text-gray-600">Availability</span>

                        <span
                          className={`font-medium text-right ${
                            product.inStock ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {product.inStock ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trust" className="mt-4">
                    <div className="space-y-3 text-gray-600">
                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        Products are loaded directly from WooCommerce.
                      </p>

                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        Cart state persists securely using WooCommerce sessions.
                      </p>

                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        Built for safe online shopping in Zambia.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
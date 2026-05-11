import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Check,
  Heart,
  Phone,
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

import gsap from 'gsap';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<WooProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('description');

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
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }
      );

      gsap.fromTo(
        '.product-info',
        { opacity: 0, x: 40 },
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

  const buyUrl = product?.permalink || 'https://digitalhood.info';

  return (
    <div ref={pageRef} className="min-h-screen bg-white">
      <Header />

      <main className="pt-6 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link to="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/shop" className="hover:text-black transition-colors">
              Shop
            </Link>
            {product?.categories?.[0] && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span>{product.categories[0].name}</span>
              </>
            )}
            {product && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-black truncate max-w-[220px]">
                  {product.name}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
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
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="product-image">
                <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                  <img
                    src={productImages[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />

                  <Badge className="absolute top-4 left-4 bg-black text-white font-semibold">
                    {product.inStock ? 'In stock' : 'Out of stock'}
                  </Badge>
                </div>

                {productImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {productImages.map((image, index) => (
                      <button
                        key={image}
                        onClick={() => setSelectedImage(index)}
                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
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

              <div className="product-info">
                <div className="mb-4">
                  <h1 className="font-display font-bold text-2xl lg:text-4xl text-black mb-3">
                    {product.name}
                  </h1>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
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

                <div className="flex items-center gap-4 mb-6">
                  <span className="font-display font-bold text-3xl lg:text-4xl text-black">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {product.shortDescription ||
                    product.description ||
                    'This product is available from DigitalHood.'}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {product.categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="rounded-full"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <a href={buyUrl}>
                    <Button
                      disabled={!product.inStock}
                      className="min-w-[220px] h-12 rounded-xl bg-black hover:bg-[#ffb54a] hover:text-black text-white font-semibold"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {product.hasOptions ? 'Select Options' : 'Buy Securely'}
                    </Button>
                  </a>

                  <Button
                    variant="outline"
                    className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-black"
                  >
                    <Heart className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-black"
                    onClick={() => navigator.share?.({
                      title: product.name,
                      url: window.location.href,
                    })}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-8">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-black" />
                    <span className="text-sm">Delivery in Zambia</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-black" />
                    <span className="text-sm">Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-black" />
                    <span className="text-sm">Seller support</span>
                  </div>
                </div>

                <div className="bg-black rounded-xl p-4 mb-8">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-white font-medium">
                        Need help with this product?
                      </p>
                      <p className="text-gray-400 text-sm">
                        Call DigitalHood for product support
                      </p>
                    </div>

                    <a
                      href="tel:+260971047570"
                      className="flex items-center gap-2 bg-[#ffb54a] text-black px-4 py-2 rounded-lg font-medium hover:bg-white transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      +260 971 047 570
                    </a>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="trust">Trust</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="mt-4">
                    <p className="text-gray-600 leading-relaxed">
                      {product.description ||
                        product.shortDescription ||
                        'Product details are managed from WooCommerce.'}
                    </p>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Product type</span>
                        <span className="font-medium capitalize">{product.type}</span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Availability</span>
                        <span
                          className={`font-medium ${
                            product.inStock ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {product.inStock ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Checkout</span>
                        <span className="font-medium">WooCommerce secure checkout</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trust" className="mt-4">
                    <div className="space-y-3 text-gray-600">
                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5" />
                        Products are loaded directly from DigitalHood WooCommerce.
                      </p>
                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5" />
                        Checkout happens securely on digitalhood.info.
                      </p>
                      <p className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5" />
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
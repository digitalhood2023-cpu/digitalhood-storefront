import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  Star, 
  Share2, 
  Truck, 
  Shield, 
  RotateCcw,
  ChevronRight,
  Minus,
  Plus,
  Check,
  Phone
} from 'lucide-react';
import { products } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import gsap from 'gsap';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState(products.find(p => p.id === id) || products[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const foundProduct = products.find(p => p.id === id);
    if (foundProduct) {
      setProduct(foundProduct);
      // Add to recently viewed
      addToRecentlyViewed(foundProduct);
    }
    window.scrollTo(0, 0);
  }, [id, addToRecentlyViewed]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.product-image',
        { opacity: 0, x: -50 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out' }
      );
      gsap.fromTo(
        '.product-info',
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out', delay: 0.2 }
      );
    }, pageRef);

    return () => ctx.revert();
  }, [product]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const formatPrice = (price: number) => `K${price.toLocaleString()}`;

  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Generate additional product images
  const productImages = [
    product.image,
    product.image,
    product.image,
  ];

  return (
    <div ref={pageRef} className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-6 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link to="/" className="hover:text-black transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/shop" className="hover:text-black transition-colors">Shop</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/category/${product.category.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-black transition-colors">
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-black truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Images */}
            <div className="product-image">
              {/* Main Image */}
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.badge && (
                  <Badge className="absolute top-4 left-4 bg-[#ffb54a] text-black font-semibold">
                    {product.badge}
                  </Badge>
                )}
                {discount > 0 && (
                  <Badge className="absolute top-4 right-4 bg-red-500 text-white font-semibold">
                    -{discount}%
                  </Badge>
                )}
              </div>

              {/* Thumbnail Images */}
              <div className="flex gap-3">
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-black'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="product-info">
              {/* Title & Rating */}
              <div className="mb-4">
                <h1 className="font-display font-bold text-2xl lg:text-3xl text-black mb-3">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? 'fill-[#ffb54a] text-[#ffb54a]'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4 mb-6">
                <span className="font-display font-bold text-3xl lg:text-4xl text-black">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-gray-600 mb-6">
                {product.description}
              </p>

              {/* SKU */}
              <div className="text-sm text-gray-500 mb-6">
                SKU: <span className="font-medium text-black">{product.sku}</span>
              </div>

              {/* Quantity & Actions */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                {/* Quantity Selector */}
                <div className="flex items-center border-2 border-gray-200 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  className={`flex-1 min-w-[200px] h-12 rounded-xl font-semibold transition-all ${
                    isAdded
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                  } text-white`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>

                {/* Wishlist */}
                <Button
                  variant="outline"
                  onClick={() => toggleWishlist(product)}
                  className={`w-12 h-12 rounded-xl border-2 transition-all ${
                    isInWishlist(product.id)
                      ? 'border-red-500 text-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-black'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                </Button>

                {/* Share */}
                <Button
                  variant="outline"
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-black"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-8">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-black" />
                  <span className="text-sm">Free delivery over K500</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-black" />
                  <span className="text-sm">Quality guarantee</span>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-black" />
                  <span className="text-sm">30-day returns</span>
                </div>
              </div>

              {/* Contact CTA */}
              <div className="bg-black rounded-xl p-4 mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-white font-medium">Need help with this product?</p>
                    <p className="text-gray-400 text-sm">Call us for expert advice</p>
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

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="mt-4">
                  <div className="prose max-w-none">
                    <p className="text-gray-600">
                      {product.description}
                    </p>
                    {product.features && (
                      <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
                        {product.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="specifications" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium">{product.category}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">SKU</span>
                      <span className="font-medium">{product.sku}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Availability</span>
                      <span className={`font-medium ${product.inStock ? 'text-green-500' : 'text-red-500'}`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    {product.stockCount && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Stock</span>
                        <span className="font-medium">{product.stockCount} units</span>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="reviews" className="mt-4">
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      {product.reviews} customers have reviewed this product
                    </p>
                    <Button variant="outline" className="rounded-full">
                      Write a Review
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

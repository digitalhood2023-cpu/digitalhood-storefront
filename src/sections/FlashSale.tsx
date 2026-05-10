import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, Flame, Check } from 'lucide-react';
import { flashSaleProducts } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function FlashSale() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 2, hours: 14, minutes: 35, seconds: 42 });
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            } else {
              hours = 23;
              if (days > 0) {
                days--;
              }
            }
          }
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.flash-banner',
        { x: -100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        '.countdown-box',
        { rotateX: -90, opacity: 0 },
        {
          rotateX: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        '.flash-product',
        { x: 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.flash-products',
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleAddToCart = (product: typeof flashSaleProducts[0]) => {
    addToCart(product);
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  const formatPrice = (price: number) => `K${price.toLocaleString()}`;

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <section ref={sectionRef} className="py-16 lg:py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Flash Sale Header */}
        <div className="flash-banner relative bg-gradient-to-r from-red-500 via-orange-500 to-[#ffb54a] rounded-3xl p-6 lg:p-10 mb-10 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl lg:text-4xl text-white mb-1">
                  Flash Sale
                </h2>
                <p className="text-white/80 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Limited Time Only!
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-3">
              {[
                { value: timeLeft.days, label: 'Days' },
                { value: timeLeft.hours, label: 'Hours' },
                { value: timeLeft.minutes, label: 'Mins' },
                { value: timeLeft.seconds, label: 'Secs' },
              ].map((item, index) => (
                <div key={index} className="countdown-box text-center">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-xl flex items-center justify-center mb-1">
                    <span className="font-display font-bold text-xl lg:text-2xl text-red-500">
                      {formatTime(item.value)}
                    </span>
                  </div>
                  <span className="text-xs text-white/80">{item.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link to="/deals">
              <Button
                size="lg"
                className="bg-white text-red-500 hover:bg-gray-100 rounded-full px-8 font-semibold"
              >
                Shop the Sale
              </Button>
            </Link>
          </div>
        </div>

        {/* Flash Sale Products */}
        <div className="flash-products grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {flashSaleProducts.map((product) => (
            <div
              key={product.id}
              className="flash-product group bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-[#ffb54a] transition-all duration-300 hover:shadow-lg"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Link to={`/product/${product.id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                {/* Discount Badge */}
                <Badge className="absolute top-3 left-3 bg-red-500 text-white font-bold">
                  {product.badge}
                </Badge>

                {/* Stock Indicator */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <div className="flex items-center justify-between text-white text-sm mb-1">
                    <span>Stock</span>
                    <span className="font-semibold">{product.stockCount} left</span>
                  </div>
                  <Progress
                    value={(product.stockCount || 0) * 10}
                    className="h-2 bg-white/30"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-medium text-black hover:text-[#ffb54a] transition-colors line-clamp-2 mb-2 text-sm">
                    {product.name}
                  </h3>
                </Link>

                {/* Prices */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-display font-bold text-lg text-red-500">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.originalPrice || 0)}
                  </span>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={() => handleAddToCart(product)}
                  className={`w-full rounded-xl transition-all ${
                    addedToCart === product.id
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-black hover:bg-[#ffb54a] hover:text-black'
                  } text-white`}
                  size="sm"
                >
                  {addedToCart === product.id ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

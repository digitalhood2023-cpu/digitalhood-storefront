import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline animation
      gsap.fromTo(
        '.hero-line',
        { y: 40, opacity: 0, clipPath: 'inset(100% 0 0 0)' },
        {
          y: 0,
          opacity: 1,
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.8,
          stagger: 0.15,
          ease: 'expo.out',
          delay: 0.3,
        }
      );

      // Subheadline animation
      gsap.fromTo(
        '.hero-subheadline',
        { y: 20, opacity: 0, filter: 'blur(10px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.9,
        }
      );

      // CTA buttons animation
      gsap.fromTo(
        '.hero-cta',
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.7)',
          delay: 1.1,
        }
      );

      // Hero image animation
      gsap.fromTo(
        imageRef.current,
        { opacity: 0, rotateY: 15, z: -100 },
        {
          opacity: 1,
          rotateY: 0,
          z: 0,
          duration: 1,
          ease: 'expo.out',
          delay: 0.5,
        }
      );

      // Trust indicators animation
      gsap.fromTo(
        '.trust-item',
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.15,
          ease: 'back.out(1.7)',
          delay: 1.4,
        }
      );

      // Floating orbs animation
      gsap.to('.orb-1', {
        x: 30,
        y: -20,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.orb-2', {
        x: -20,
        y: 30,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      });

      gsap.to('.orb-3', {
        x: 15,
        y: -15,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 4,
      });

      // Hero image micro-float
      gsap.to(imageRef.current, {
        y: -8,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[90vh] lg:min-h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-[#ffb54a]/10"
    >
      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb-1 absolute top-20 left-10 w-64 h-64 bg-black/5 rounded-full blur-3xl" />
        <div className="orb-2 absolute bottom-20 right-20 w-80 h-80 bg-[#ffb54a]/20 rounded-full blur-3xl" />
        <div className="orb-3 absolute top-1/2 left-1/3 w-48 h-48 bg-black/5 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[70vh]">
          {/* Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            {/* Slogan Badge */}
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4 text-[#ffb54a]" />
              <span className="text-sm font-medium tracking-wide">FIXING TOMORROW TODAY</span>
            </div>

            <div ref={headlineRef} className="mb-6">
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight">
                <span className="hero-line block text-black">Premium Tech</span>
                <span className="hero-line block text-black">For Zambia</span>
                <span className="hero-line block text-[#ffb54a]">Delivered</span>
              </h1>
            </div>

            <p className="hero-subheadline text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-8">
              Discover quality smartphones, accessories, and gadgets at unbeatable prices. 
              Fast delivery across Zambia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link to="/shop" className="hero-cta">
                <Button 
                  size="lg" 
                  className="bg-black hover:bg-[#ffb54a] hover:text-black text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
                >
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/deals" className="hero-cta">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-2 border-black text-black hover:bg-black hover:text-white px-8 py-6 text-lg rounded-full transition-all"
                >
                  Explore Deals
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 lg:gap-6">
              <div className="trust-item flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 bg-[#ffb54a]/20 rounded-full flex items-center justify-center">
                  <Truck className="w-4 h-4 text-black" />
                </div>
                <span>Free Delivery</span>
              </div>
              <div className="trust-item flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 bg-[#ffb54a]/20 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-black" />
                </div>
                <span>Quality Guaranteed</span>
              </div>
              <div className="trust-item flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 bg-[#ffb54a]/20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-black" />
                </div>
                <span>Secure Payment</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end" style={{ perspective: '1000px' }}>
            <div
              ref={imageRef}
              className="relative"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Main Image */}
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=700&fit=crop"
                  alt="Premium Tech Products"
                  className="w-full max-w-md lg:max-w-lg xl:max-w-xl rounded-3xl shadow-2xl"
                />
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-4 lg:-left-8 top-1/4 bg-white rounded-2xl shadow-lg p-3 lg:p-4 animate-float z-20">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#ffb54a]/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">📱</span>
                  </div>
                  <div>
                    <p className="font-semibold text-black text-sm lg:text-base">New Arrivals</p>
                    <p className="text-xs text-gray-500">Latest Models</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-2 lg:-right-4 bottom-1/4 bg-white rounded-2xl shadow-lg p-3 lg:p-4 animate-float z-20" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-600 text-sm lg:text-base">Verified</p>
                    <p className="text-xs text-gray-500">Authentic Products</p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -z-10 -bottom-4 lg:-bottom-6 -right-4 lg:-right-6 w-full h-full bg-black/5 rounded-3xl" />
              <div className="absolute -z-20 -bottom-8 lg:-bottom-12 -right-8 lg:-right-12 w-full h-full bg-[#ffb54a]/10 rounded-3xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}

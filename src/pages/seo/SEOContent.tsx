import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Star, Truck, Shield, Phone } from 'lucide-react';
import { products } from '@/data/products';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import gsap from 'gsap';

interface SEOContentProps {
  title: string;
  description: string;
  keywords: string[];
  categoryFilter?: string;
  content: React.ReactNode;
  faqs?: Array<{ q: string; a: string }>;
}

export default function SEOContent({ title, description, keywords, categoryFilter, content, faqs }: SEOContentProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  
  const filteredProducts = categoryFilter 
    ? products.filter(p => p.category.toLowerCase().includes(categoryFilter.toLowerCase())).slice(0, 8)
    : products.slice(0, 8);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.seo-content', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const formatPrice = (price: number) => `K${price.toLocaleString()}`;

  return (
    <div ref={pageRef} className="min-h-screen bg-white">
      <Header />
      
      {/* SEO Meta Tags - In a real app, use react-helmet */}
      <main className="pt-6 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-black transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-black">{title}</span>
          </nav>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white py-12 lg:py-16 mb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl">
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-black mb-4">
                {title}
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                {description}
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {keywords.map((keyword, i) => (
                  <span key={i} className="bg-black text-white text-xs px-3 py-1 rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/shop"
                  className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-[#ffb54a] hover:text-black transition-colors"
                >
                  Shop Now
                </Link>
                <a
                  href="tel:+260971047570"
                  className="flex items-center gap-2 border-2 border-black text-black px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Us
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
          <div className="seo-content prose prose-lg max-w-none">
            {content}
          </div>
        </div>

        {/* Featured Products */}
        {filteredProducts.length > 0 && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
            <h2 className="font-display font-bold text-2xl text-black mb-8">
              Featured {categoryFilter || 'Products'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 fill-[#ffb54a] text-[#ffb54a]" />
                      <span className="text-sm">{product.rating}</span>
                    </div>
                    <h3 className="font-medium text-black line-clamp-2 mb-2">{product.name}</h3>
                    <p className="font-bold text-lg">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Why Choose Us */}
        <div className="bg-gray-50 py-16 mb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <h2 className="font-display font-bold text-2xl text-black text-center mb-10">
              Why Buy From DigitalHood Zambia?
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2">Free Delivery</h3>
                <p className="text-gray-600 text-sm">On orders over K500 across Zambia</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2">Genuine Products</h3>
                <p className="text-gray-600 text-sm">100% authentic with warranty</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2">Best Prices</h3>
                <p className="text-gray-600 text-sm">Competitive pricing in Zambia</p>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-7 h-7 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2">24/7 Support</h3>
                <p className="text-gray-600 text-sm">Call +260 971 047 570</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        {faqs && faqs.length > 0 && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
            <h2 className="font-display font-bold text-2xl text-black mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4 max-w-3xl">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-black mb-2">{faq.q}</h3>
                  <p className="text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="bg-black rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="font-display font-bold text-2xl lg:text-3xl text-white mb-4">
              Need Help Finding the Right Product?
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              Our team is ready to assist you. Call us or visit our store in Lusaka.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="tel:+260971047570"
                className="bg-[#ffb54a] text-black px-6 py-3 rounded-full font-medium hover:bg-white transition-colors"
              >
                <Phone className="w-4 h-4 inline mr-2" />
                +260 971 047 570
              </a>
              <a
                href="mailto:Contact@digitalhood.info"
                className="border-2 border-white text-white px-6 py-3 rounded-full font-medium hover:bg-white hover:text-black transition-colors"
              >
                Contact@digitalhood.info
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

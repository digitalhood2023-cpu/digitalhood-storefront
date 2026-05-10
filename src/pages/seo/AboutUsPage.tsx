import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Award, Users, Truck, Shield, Phone, MapPin, Mail } from 'lucide-react';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import gsap from 'gsap';

export default function AboutUsPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.about-content', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-6 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-black transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-black">About Us</span>
          </nav>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white py-16 lg:py-24 mb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <img src="/logo.jpg" alt="DigitalHood" className="w-24 h-24 object-contain" />
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-black mb-4">
                About DigitalHood Zambia
              </h1>
              <p className="text-xl text-[#ffb54a] font-medium mb-4">
                Fixing Tomorrow Today
              </p>
              <p className="text-lg text-gray-600">
                Zambia's premier digital marketplace for smartphones, accessories, and tech gadgets. 
                We're committed to bringing you quality products at unbeatable prices.
              </p>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
          <div className="about-content max-w-4xl mx-auto">
            <h2 className="font-display font-bold text-2xl text-black mb-6">Our Story</h2>
            <div className="prose prose-lg text-gray-700">
              <p className="mb-4">
                DigitalHood was founded with a simple mission: to make quality technology accessible to everyone in Zambia. 
                What started as a small phone repair shop in Lusaka has grown into one of Zambia's most trusted digital 
                marketplaces.
              </p>
              <p className="mb-4">
                Our slogan "Fixing Tomorrow Today" reflects our commitment to solving your tech problems quickly and 
                efficiently. Whether you need a new smartphone, a laptop for work, or a quick screen repair, we're here 
                to help you stay connected.
              </p>
              <p>
                Today, DigitalHood serves thousands of customers across Zambia, from Lusaka to Kitwe, Ndola to Livingstone. 
                We're proud to be your trusted partner for all things tech.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-black py-16 mb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="font-display font-bold text-4xl lg:text-5xl text-[#ffb54a] mb-2">10K+</p>
                <p className="text-white">Happy Customers</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-4xl lg:text-5xl text-[#ffb54a] mb-2">500+</p>
                <p className="text-white">Products</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-4xl lg:text-5xl text-[#ffb54a] mb-2">50+</p>
                <p className="text-white">Brands</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-4xl lg:text-5xl text-[#ffb54a] mb-2">5+</p>
                <p className="text-white">Years Experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
          <h2 className="font-display font-bold text-2xl text-black text-center mb-10">
            Why Choose DigitalHood?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-7 h-7 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Quality Products</h3>
              <p className="text-gray-600 text-sm">Only genuine products from authorized distributors</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-7 h-7 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Fast Delivery</h3>
              <p className="text-gray-600 text-sm">Free delivery on orders over K500 nationwide</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Warranty</h3>
              <p className="text-gray-600 text-sm">All products come with manufacturer warranty</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-[#ffb54a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Expert Support</h3>
              <p className="text-gray-600 text-sm">Our team is always ready to help you</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 mb-16">
          <div className="bg-gray-50 rounded-2xl p-8 lg:p-12">
            <h2 className="font-display font-bold text-2xl text-black text-center mb-8">
              Get in Touch
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-[#ffb54a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">Phone</h3>
                  <p className="text-gray-600">+260 971 047 570</p>
                  <p className="text-gray-500 text-sm">Mon-Sat, 8am-6pm</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-[#ffb54a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">Email</h3>
                  <p className="text-gray-600">Contact@digitalhood.info</p>
                  <p className="text-gray-500 text-sm">We reply within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-[#ffb54a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">Location</h3>
                  <p className="text-gray-600">Lusaka, Zambia</p>
                  <p className="text-gray-500 text-sm">Visit our store</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="bg-black rounded-2xl p-8 lg:p-12 text-center">
            <h2 className="font-display font-bold text-2xl lg:text-3xl text-white mb-4">
              Ready to Shop?
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              Browse our collection of smartphones, accessories, and tech gadgets. 
              Quality products at unbeatable prices.
            </p>
            <Link
              to="/shop"
              className="inline-block bg-[#ffb54a] text-black px-8 py-3 rounded-full font-medium hover:bg-white transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

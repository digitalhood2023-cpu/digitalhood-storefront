import Header from '@/sections/Header';
import Hero from '@/sections/Hero';
import Categories from '@/sections/Categories';
import ProductShowcase from '@/sections/ProductShowcase';
import FlashSale from '@/sections/FlashSale';
import Features from '@/sections/Features';
import Testimonials from '@/sections/Testimonials';
import Services from '@/sections/Services';
import Newsletter from '@/sections/Newsletter';
import RecentlyViewed from '@/sections/RecentlyViewed';
import Footer from '@/sections/Footer';
import { newArrivals, bestSellers, trendingProducts } from '@/data/products';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Categories />
        
        {/* New Arrivals */}
        <ProductShowcase
          title="New Arrivals"
          subtitle="Check out the latest products just landed"
          products={newArrivals}
          viewAllLink="/shop?sort=newest"
          bgColor="white"
        />
        
        {/* Flash Sale */}
        <FlashSale />
        
        {/* Best Sellers */}
        <ProductShowcase
          title="Best Sellers"
          subtitle="Our most popular products loved by customers"
          products={bestSellers}
          viewAllLink="/shop?sort=best-selling"
          bgColor="gray"
        />
        
        {/* Trending Now */}
        <ProductShowcase
          title="Trending Now"
          subtitle="Hot products everyone is talking about"
          products={trendingProducts}
          viewAllLink="/shop"
          bgColor="white"
        />
        
        <Features />
        <Testimonials />
        <Services />
        <Newsletter />
        <RecentlyViewed />
      </main>
      <Footer />
    </div>
  );
}

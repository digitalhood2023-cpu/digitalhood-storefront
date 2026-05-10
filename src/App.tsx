import { Routes, Route } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { RecentlyViewedProvider } from '@/context/RecentlyViewedContext';
import Home from '@/pages/Home';
import ShopPage from '@/pages/ShopPage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';

// SEO Pages
import PhoneAccessoriesPage from '@/pages/seo/PhoneAccessoriesPage';
import IPhonePage from '@/pages/seo/IPhonePage';
import SamsungPage from '@/pages/seo/SamsungPage';
import LaptopPage from '@/pages/seo/LaptopPage';
import HeadphonesPage from '@/pages/seo/HeadphonesPage';
import PowerBankPage from '@/pages/seo/PowerBankPage';
import ScreenRepairPage from '@/pages/seo/ScreenRepairPage';
import AboutUsPage from '@/pages/seo/AboutUsPage';
import ContactPage from '@/pages/seo/ContactPage';

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <RecentlyViewedProvider>
          <Routes>
            {/* Main Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            
            {/* SEO Pages */}
            <Route path="/phone-accessories-zambia" element={<PhoneAccessoriesPage />} />
            <Route path="/iphone-zambia" element={<IPhonePage />} />
            <Route path="/samsung-phones-zambia" element={<SamsungPage />} />
            <Route path="/laptops-zambia" element={<LaptopPage />} />
            <Route path="/headphones-zambia" element={<HeadphonesPage />} />
            <Route path="/power-banks-zambia" element={<PowerBankPage />} />
            <Route path="/screen-repair-zambia" element={<ScreenRepairPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            
            {/* Alias routes for better SEO */}
            <Route path="/buy-iphone-zambia" element={<IPhonePage />} />
            <Route path="/buy-samsung-zambia" element={<SamsungPage />} />
            <Route path="/buy-laptop-zambia" element={<LaptopPage />} />
            <Route path="/phone-repair-lusaka" element={<ScreenRepairPage />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </RecentlyViewedProvider>
      </WishlistProvider>
    </CartProvider>
  );
}

export default App;

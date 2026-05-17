import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import { AccountProvider } from '@/context/AccountContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { RecentlyViewedProvider } from '@/context/RecentlyViewedContext'
import SEO from '@/components/SEO'

const Home = lazy(() => import('@/pages/Home'))
const ShopPage = lazy(() => import('@/pages/ShopPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))

const PhoneAccessoriesPage = lazy(() => import('@/pages/seo/PhoneAccessoriesPage'))
const IPhonePage = lazy(() => import('@/pages/seo/IPhonePage'))
const SamsungPage = lazy(() => import('@/pages/seo/SamsungPage'))
const LaptopPage = lazy(() => import('@/pages/seo/LaptopPage'))
const HeadphonesPage = lazy(() => import('@/pages/seo/HeadphonesPage'))
const PowerBankPage = lazy(() => import('@/pages/seo/PowerBankPage'))
const ScreenRepairPage = lazy(() => import('@/pages/seo/ScreenRepairPage'))
const AboutUsPage = lazy(() => import('@/pages/seo/AboutUsPage'))
const ContactPage = lazy(() => import('@/pages/seo/ContactPage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <img
          src="/logo.jpg"
          alt="DigitalHood"
          className="mx-auto h-16 w-16 object-contain mb-4"
        />
        <p className="text-sm font-medium text-gray-600">
          Loading DigitalHood...
        </p>
      </div>
    </div>
  )
}

function App() {
  return (
    <AccountProvider>
      <WishlistProvider>
        <RecentlyViewedProvider>
          <SEO />

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />

              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/track-order" element={<TrackOrderPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/phone-accessories-zambia" element={<PhoneAccessoriesPage />} />
              <Route path="/iphone-zambia" element={<IPhonePage />} />
              <Route path="/samsung-phones-zambia" element={<SamsungPage />} />
              <Route path="/laptops-zambia" element={<LaptopPage />} />
              <Route path="/headphones-zambia" element={<HeadphonesPage />} />
              <Route path="/power-banks-zambia" element={<PowerBankPage />} />
              <Route path="/screen-repair-zambia" element={<ScreenRepairPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/contact" element={<ContactPage />} />

              <Route path="/buy-iphone-zambia" element={<IPhonePage />} />
              <Route path="/buy-samsung-zambia" element={<SamsungPage />} />
              <Route path="/buy-laptop-zambia" element={<LaptopPage />} />
              <Route path="/phone-repair-lusaka" element={<ScreenRepairPage />} />

              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </RecentlyViewedProvider>
      </WishlistProvider>
    </AccountProvider>
  )
}

export default App
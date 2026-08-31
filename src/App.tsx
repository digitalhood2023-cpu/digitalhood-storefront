import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Routes, Route, useLocation, useNavigationType, useParams } from 'react-router-dom'

import { AccountProvider } from '@/context/AccountContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { RecentlyViewedProvider } from '@/context/RecentlyViewedContext'
import { MarketplaceStateProvider } from '@/context/MarketplaceStateContext'
import MarketplaceSEO from '@/components/MarketplaceSEO'
import { clearBodyScrollLocks } from '@/lib/bodyScrollLock'
import { getCurrentSellerDomainContext, getMarketplaceUrl } from '@/lib/sellerDomains'
import MarketplacePolicyPage from './pages/MarketplacePolicyPage'

const Home = lazy(() => import('@/pages/Home'))
const ShopPage = lazy(() => import('@/pages/ShopPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const SellerStorePage = lazy(() => import('@/pages/SellerStorePage'))
const SellerDomainStorefrontPage = lazy(() => import('@/pages/SellerDomainStorefrontPage'))
const ShopsPage = lazy(() => import('@/pages/ShopsPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))
const RecentlyViewedPage = lazy(() => import('@/pages/RecentlyViewedPage'))
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage'))
const OrderTrackingDetailsPage = lazy(() => import('@/pages/OrderTrackingDetailsPage'))
const OrderPaymentRetryPage = lazy(() => import('@/pages/OrderPaymentRetryPage'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const AccountDetailsPage = lazy(() => import('@/pages/AccountDetailsPage'))
const AccountSupportCasesPage = lazy(() => import('@/pages/AccountSupportCasesPage'))
const AccountOrderIssuePage = lazy(() => import('@/pages/AccountOrderIssuePage'))
const AccountMessagesPage = lazy(() => import('@/pages/AccountMessagesPage'))
const AccountNotificationsPage = lazy(() => import('@/pages/AccountNotificationsPage'))
const AccountFeedbackPage = lazy(() => import('@/pages/AccountFeedbackPage'))
const MemberFeedbackPage = lazy(() => import('@/pages/MemberFeedbackPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))

const PhoneAccessoriesPage = lazy(() => import('@/pages/seo/PhoneAccessoriesPage'))
const IPhonePage = lazy(() => import('@/pages/seo/IPhonePage'))
const SamsungPage = lazy(() => import('@/pages/seo/SamsungPage'))
const LaptopPage = lazy(() => import('@/pages/seo/LaptopPage'))
const HeadphonesPage = lazy(() => import('@/pages/seo/HeadphonesPage'))
const PowerBankPage = lazy(() => import('@/pages/seo/PowerBankPage'))
const ScreenRepairPage = lazy(() => import('@/pages/seo/ScreenRepairPage'))
const AboutUsPage = lazy(() => import('@/pages/seo/AboutUsPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))

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

function SellerFeedbackRedirect() {
  const location = useLocation()

  useEffect(() => {
    const feedbackId = new URLSearchParams(location.search).get('feedback')
    const destination = new URL('/feedback', 'https://seller.digitalhood.info')

    if (feedbackId) destination.searchParams.set('feedback', feedbackId)
    window.location.replace(destination.toString())
  }, [location.search])

  return <PageLoader />
}

function NavigationScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const link = target?.closest('a')

      if (!link) return
      if (link.target && link.target !== '_self') return
      if (link.hasAttribute('download')) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return

      try {
        const nextUrl = new URL(href, window.location.href)

        if (nextUrl.origin !== window.location.origin) return

        const isDifferentPage = nextUrl.pathname !== window.location.pathname

        if (isDifferentPage) {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }
      } catch {
        // Ignore unusual href values.
      }
    }

    document.addEventListener('click', handleLinkClick, true)

    return () => {
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [])

  useEffect(() => {
    clearBodyScrollLocks()

    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [location.pathname, location.search, location.hash, navigationType])

  return null
}

function LegacyOrderDetailsRedirect() {
  const { orderId = '' } = useParams()
  return <Navigate to={`/track-order/${encodeURIComponent(orderId)}`} replace />
}

function App() {
  const sellerDomain = getCurrentSellerDomainContext()

  if (sellerDomain) {
    if (window.location.pathname !== '/') {
      window.location.replace(
        getMarketplaceUrl(
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        )
      )
      return <PageLoader />
    }

    return (
      <Suspense fallback={<PageLoader />}>
        <SellerDomainStorefrontPage hostname={sellerDomain.hostname} />
      </Suspense>
    )
  }

  return (
    <AccountProvider>
      <NotificationsProvider>
        <MarketplaceStateProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
            <MarketplaceSEO />
            <NavigationScrollManager />

            <div className="min-h-[100svh]">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/search" element={<ShopPage />} />
                <Route path="/category/:categorySlug" element={<ShopPage />} />
                <Route path="/collections/:collectionSlug" element={<ShopPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/shops" element={<ShopsPage />} />
                <Route path="/seller/:sellerKey" element={<SellerStorePage />} />
                <Route path="/stores/:sellerKey" element={<SellerStorePage />} />

                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/recently-viewed" element={<RecentlyViewedPage />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/track-order/:orderId" element={<OrderTrackingDetailsPage />} />

                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/details" element={<AccountDetailsPage />} />
                <Route path="/account/support-cases" element={<AccountSupportCasesPage />} />
                <Route path="/account/orders/:orderId/report" element={<AccountOrderIssuePage />} />
                <Route path="/account/messages" element={<AccountMessagesPage />} />
                <Route path="/account/messages/:conversationId" element={<AccountMessagesPage />} />
                <Route path="/account/notifications" element={<AccountNotificationsPage />} />
                <Route path="/account/feedback" element={<AccountFeedbackPage />} />
                <Route path="/seller-feedback" element={<SellerFeedbackRedirect />} />
                <Route path="/member/:memberKey" element={<MemberFeedbackPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId" element={<LegacyOrderDetailsRedirect />} />
                <Route path="/orders/:orderId/pay" element={<OrderPaymentRetryPage />} />

                <Route path="/help" element={<InfoPage />} />
                <Route path="/faqs" element={<InfoPage />} />
                <Route path="/shipping" element={<InfoPage />} />
                <Route path="/returns" element={<InfoPage />} />
                <Route path="/warranty" element={<InfoPage />} />
                <Route path="/terms" element={<InfoPage />} />
                <Route path="/privacy" element={<InfoPage />} />
                <Route path="/cookies" element={<InfoPage />} />
                <Route path="/marketplace-terms" element={<MarketplacePolicyPage />} />
                <Route path="/seller-terms" element={<MarketplacePolicyPage />} />
                <Route path="/prohibited-products" element={<MarketplacePolicyPage />} />
                <Route path="/dispute-resolution" element={<MarketplacePolicyPage />} />
                <Route path="/data-protection" element={<MarketplacePolicyPage />} />
                <Route path="/incident-response" element={<MarketplacePolicyPage />} />
                <Route path="/sitemap" element={<InfoPage />} />
                <Route path="/blog" element={<InfoPage />} />

                <Route path="/phone-accessories-zambia" element={<PhoneAccessoriesPage />} />
                <Route path="/iphone-zambia" element={<IPhonePage />} />
                <Route path="/samsung-phones-zambia" element={<SamsungPage />} />
                <Route path="/laptops-zambia" element={<LaptopPage />} />
                <Route path="/headphones-zambia" element={<HeadphonesPage />} />
                <Route path="/power-banks-zambia" element={<PowerBankPage />} />
                <Route path="/screen-repair-zambia" element={<ScreenRepairPage />} />
                <Route path="/about" element={<AboutUsPage />} />
                <Route path="/contact" element={<SupportPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/support/track" element={<SupportPage />} />

                <Route path="/buy-iphone-zambia" element={<IPhonePage />} />
                <Route path="/buy-samsung-zambia" element={<SamsungPage />} />
                <Route path="/buy-laptop-zambia" element={<LaptopPage />} />
                <Route path="/phone-repair-lusaka" element={<ScreenRepairPage />} />

                <Route path="*" element={<Home />} />
                </Routes>
              </Suspense>
            </div>
            </RecentlyViewedProvider>
          </WishlistProvider>
        </MarketplaceStateProvider>
      </NotificationsProvider>
    </AccountProvider>
  )
}

export default App

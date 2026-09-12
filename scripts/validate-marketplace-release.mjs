import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(`Marketplace release contract failed: ${message}`)
}

const checkout = read('src/pages/CheckoutPage.tsx')
const overlay = read('src/components/checkout/CheckoutProgressOverlay.tsx')
const stripe = read('src/components/payments/StripeCheckoutForm.tsx')
const lencoApi = read('src/api/lenco.ts')
const paymentsApi = read('src/api/payments.ts')
const paymentRecoveryApi = read('src/api/paymentRecovery.ts')
const paymentRetryPage = read('src/pages/OrderPaymentRetryPage.tsx')
const product = read('src/pages/ProductPage.tsx')
const productDetails = read('src/lib/productDetails.ts')
const productGallery = read('src/lib/productGallery.ts')
const pointZoom = read('src/hooks/usePointZoom.ts')
const chatLightbox = read('src/components/chat/ChatImageLightbox.tsx')
const themeContext = read('src/context/ThemeContext.tsx')
const globalStyles = read('src/index.css')
const brandMark = read('src/components/DigitalHoodMark.tsx')
const homeHero = read('src/sections/Hero.tsx')
const homeCategories = read('src/sections/Categories.tsx')
const home = read('src/pages/Home.tsx')
const homeDiscovery = read('src/lib/homeDiscovery.ts')
const productShowcase = read('src/sections/ProductShowcase.tsx')
const flashSale = read('src/sections/FlashSale.tsx')
const recentlyViewed = read('src/sections/RecentlyViewed.tsx')
const recentlyViewedPage = read('src/pages/RecentlyViewedPage.tsx')
const favicon = read('public/favicon.svg')
const woocommerce = read('src/lib/woocommerce.ts')
const shop = read('src/pages/ShopPage.tsx')
const searchAutocomplete = read('src/components/search/SearchAutocomplete.tsx')
const imageSearch = read('src/lib/imageSearch.ts')
const buyerChat = read('src/pages/AccountMessagesPage.tsx')
const notificationDrawer = read('src/components/notifications/NotificationDrawer.tsx')
const notificationPage = read('src/pages/AccountNotificationsPage.tsx')
const orders = read('src/pages/OrdersPage.tsx')
const accountApi = read('src/api/account.ts')
const cartDrawer = read('src/features/cart/CartDrawer.tsx')
const wishlistDrawer = read('src/components/wishlist/WishlistDrawer.tsx')
const sellerStore = read('src/pages/SellerStorePage.tsx')
const sellerDomainStore = read('src/pages/SellerDomainStorefrontPage.tsx')
const sellerDomainCategories = read('src/pages/SellerDomainCategoriesPage.tsx')
const sellerCheckout = read('src/api/sellerCheckout.ts')
const sellerOrderComplete = read('src/pages/SellerOrderCompletePage.tsx')
const appRouter = read('src/App.tsx')
const sellerDomains = read('src/lib/sellerDomains.ts')
const storefrontServer = read('server.js')
const tracking = read('src/pages/OrderTrackingDetailsPage.tsx')
const accountOrderIssue = read('src/pages/AccountOrderIssuePage.tsx')
const supportLinks = read('src/lib/supportLinks.ts')
const html = read('index.html')
const optimisticTextSend = buyerChat.slice(
  buyerChat.indexOf('const optimisticMessage: ChatMessage'),
  buyerChat.indexOf('async function retryOptimisticMessage')
)

assert(
  !checkout.includes('Checking out as ') &&
    !checkout.includes('Manage account') &&
    !checkout.includes('Your account email is attached automatically'),
  'the obsolete signed-in checkout card must stay removed'
)
assert(
  chatLightbox.includes('usePointZoom') &&
    pointZoom.includes("mode: 'pinch'") &&
    pointZoom.includes("mode: 'single'"),
  'chat images must preserve focal pinch zoom and bounded panning'
)
assert(
  themeContext.includes("ThemePreference = 'system' | 'light' | 'dark'") &&
    themeContext.includes("matchMedia('(prefers-color-scheme: dark)')") &&
    html.includes('digitalhood-theme-preference-v1') &&
    globalStyles.includes("html[data-theme='dark']"),
  'system-aware light/dark appearance and the manual override must remain available'
)
assert(
  brandMark.includes('dh-brand-mark') &&
    globalStyles.includes("html[data-theme='dark'] .dh-brand-mark-image") &&
    html.includes('href="/favicon.svg"') &&
    favicon.includes('prefers-color-scheme: dark'),
  'the DigitalHood mark and browser icon must remain circular and appearance-aware'
)
assert(
  homeHero.includes('dh-home-hero') &&
    homeHero.includes('lg:text-[3.35rem]') &&
    !homeHero.includes('lg:text-[4.7rem]') &&
    !homeHero.includes('Secure marketplace checkout') &&
    !homeHero.includes('Protected payment flow') &&
    !homeHero.includes('Pay your way') &&
    !homeHero.includes('Cards and mobile money') &&
    !homeHero.includes('Delivery across Zambia') &&
    !homeHero.includes('Clear delivery details') &&
    globalStyles.includes('.dh-home-hero {') &&
    globalStyles.includes("html[data-theme='dark'] .dh-home-hero"),
  'the homepage hero must remain compact, theme-aware, and free of the obsolete feature strip'
)
assert(
  recentlyViewed.includes('dh-recently-viewed') &&
    recentlyViewed.includes('snap-mandatory') &&
    recentlyViewedPage.includes("viewMode === 'grid'") &&
    recentlyViewedPage.includes('Clear history') &&
    shop.includes('<RecentlyViewed />'),
  'recently viewed must retain one compact reusable rail and a compact history manager'
)
assert(
  home.includes('fetchHomeDiscovery(interests, 12)') &&
    home.includes('deriveHomeDiscoveryInterests') &&
    home.includes('title="Picked for You"') &&
    home.includes('analyticsStrategy="best-selling"') &&
    home.includes('products={discovery.shelves.flashSales}') &&
    !home.includes('fetchWooProducts(36, 1)') &&
    !flashSale.includes('fetchWooProducts') &&
    woocommerce.includes('/api/discovery/home') &&
    homeDiscovery.includes('if (interests.length >= 5) break') &&
    productShowcase.includes("eventKey: 'recommendation_impression'") &&
    productShowcase.includes("eventKey: 'recommendation_click'") &&
    flashSale.includes("strategy: 'flash-sale'"),
  'homepage shelves must come from one personalized discovery response with consent-aware recommendation measurements'
)

const summaryIndex = checkout.indexOf('Order Summary')
const addressIndex = checkout.indexOf('checkout-delivery-address')
const totalsIndex = checkout.indexOf('Subtotal')
const paymentIndex = checkout.indexOf('Payment Method')
assert(summaryIndex >= 0, 'order summary is missing')
assert(
  summaryIndex < addressIndex && addressIndex < totalsIndex && totalsIndex < paymentIndex,
  'the compact address must remain inside Summary before totals and Payment'
)
assert(
  !checkout.includes('3\n                    </div>') &&
    checkout.includes('Choose how you want to pay.'),
  'payment must remain the compact second checkout step'
)
assert(
  checkout.includes('Place order · '),
  'the final order action must remain inside the payment step'
)
assert(
  checkout.includes("setCheckoutProgressStage('failed')") &&
    checkout.includes("setCheckoutProgressStage('delayed')"),
  'failed and delayed payment outcomes must use the unified checkout overlay'
)
assert(
  overlay.includes("| 'confirmed'") &&
    overlay.includes("| 'failed'") &&
    overlay.includes("| 'delayed'") &&
    overlay.includes('What happens next') &&
    overlay.includes('Try payment again'),
  'the overlay must retain confirmed, failed, delayed, and retry states'
)
assert(
  !checkout.includes('Prepare Card Payment') &&
    checkout.includes("mode: 'payment'") &&
    checkout.includes("paymentMethodTypes: ['card', 'link']") &&
    paymentRetryPage.includes("paymentMethodTypes: ['card', 'link']") &&
    checkout.includes('onCreatePayment={createCardPaymentOnSubmit}') &&
    checkout.includes('onConfirming={handleCardPaymentConfirming}'),
  'card fields must render immediately with one explicit card and Link method contract'
)
const stripeSubmitIndex = stripe.indexOf('await elements.submit()')
const stripeOverlayIndex = stripe.indexOf('onProcessing?.()')
const stripeIntentIndex = stripe.indexOf('await onCreatePayment?.()')
const stripeConfirmIndex = stripe.indexOf('await stripe.confirmPayment')
assert(
  stripeSubmitIndex >= 0 &&
    stripeSubmitIndex < stripeOverlayIndex &&
    stripeOverlayIndex < stripeIntentIndex &&
    stripeIntentIndex < stripeConfirmIndex &&
    stripe.includes("await onFailure?.(") &&
    stripe.includes('getCustomerCardErrorMessage') &&
    stripe.includes("'confirmation',") &&
    stripe.includes('preparedPayment?.paymentIntentId') &&
    stripe.includes('await onSuccess('),
  'card details must validate before pay-time order creation and shared blocking confirmation'
)
assert(
  paymentRetryPage.includes("setSelectedMethod(response.order.paymentRetry.method)") &&
    paymentRetryPage.includes("paymentMethod: 'card'") &&
    paymentRetryPage.includes("paymentMethod: 'mobile'") &&
    paymentRetryPage.includes('onCreatePayment={createPayNowCardPayment}') &&
    paymentRecoveryApi.includes("paymentMethod?: 'card' | 'mobile'"),
  'Pay Now must offer Card and Mobile Money on the same order with deferred card preparation'
)
assert(
  checkout.includes('foregroundConfirmationBudgetMs = 10_000') &&
    checkout.includes('liveConfirmationWatchMs = 5 * 60_000') &&
    checkout.includes('window.setTimeout(poll, 750)') &&
    checkout.includes('? 1250') &&
    checkout.includes('? 2000') &&
    checkout.includes(': 5000') &&
    checkout.includes('hasEnteredBackgroundConfirmation') &&
    lencoApi.includes("cache: 'no-store'") &&
    paymentsApi.includes("cache: 'no-store'") &&
    paymentsApi.includes("'/api/payments/stripe/intents'") &&
    paymentsApi.includes("'/api/payments/stripe/verify'") &&
    paymentsApi.includes("clientOutcome: 'failed' | 'unknown'"),
  'payment checks must use gateway-safe routes, a ten-second blocking budget, a bounded same-reference live watch, and no-store responses'
)
assert(
  paymentRetryPage.includes("{ paymentIntentId, clientOutcome: 'failed' }") &&
    paymentRetryPage.includes("const handleCardPaymentFailure = async") &&
    paymentRetryPage.includes("lifecycle: 'pay-now'") &&
    paymentRetryPage.includes('switchAllowed: true'),
  'a terminal card failure must immediately reopen Card and Mobile Money on the same order'
)

assert(
  buyerChat.includes("import ChatImageLightbox") &&
    buyerChat.includes('onOpenImage={setSelectedChatImage}') &&
    buyerChat.includes('<video') &&
    buyerChat.includes('playsInline'),
  'chat images must use the in-app lightbox while videos remain inline'
)
assert(
    buyerChat.includes('dh-chat-shell') &&
    buyerChat.includes('dh-chat-canvas') &&
    buyerChat.includes('dh-chat-bubble-incoming') &&
    buyerChat.includes('dh-chat-bubble-outgoing') &&
    buyerChat.includes('dh-chat-composer') &&
    globalStyles.includes('--dh-chat-canvas: #08111e') &&
    globalStyles.includes("html[data-theme='dark'] .dh-chat-canvas") &&
    globalStyles.includes('.dh-chat-bubble-incoming'),
  'conversations must retain a dark canvas and explicit readable surfaces, bubbles, and composer'
)
assert(
  notificationDrawer.includes('dh-notification-panel') &&
    notificationDrawer.includes('dh-notification-title') &&
    notificationDrawer.includes('dark:bg-indigo-950/70') &&
    notificationPage.includes('dh-notifications-page') &&
    notificationPage.includes('dh-notification-surface') &&
    notificationPage.includes('dh-notification-filter') &&
    globalStyles.includes('--dh-ui-text: #f8fafc') &&
    globalStyles.includes('.dh-notification-item-unread'),
  'notification drawer and feed must retain shared high-contrast light and dark tokens'
)
assert(
    optimisticTextSend.includes('mergeChatMessages(current, [optimisticMessage])') &&
    optimisticTextSend.indexOf('mergeChatMessages(current, [optimisticMessage])') <
      optimisticTextSend.indexOf('await sendBuyerMessage(') &&
    optimisticTextSend.includes("localStatus: 'sending'") &&
    optimisticTextSend.includes("localStatus: 'failed'") &&
    optimisticTextSend.includes('clientMessageId'),
  'buyer chat must remain optimistic, retryable, and reconcilable'
)

assert(
  product.includes('suppressGalleryTapRef') &&
    product.includes('onTouchMove={handleTouchMove}') &&
    product.includes('handleProductImageClick') &&
    product.includes('touch-pan-y'),
  'product scrolling and swiping must suppress accidental gallery taps'
)
assert(
  product.includes('openGallery(selectedImage)') &&
    product.includes('productTouchGestureRef') &&
    product.includes('usePointZoom') &&
    product.includes('touch-none') &&
    pointZoom.includes('worldX: (focalX - current.x) / current.scale') &&
    pointZoom.includes('x: focalX - worldX * nextScale') &&
    productGallery.includes('deduplicateProductImages'),
  'product galleries must support one-tap iOS opening, point-centred pinch/pan zoom, and duplicate-image removal'
)
assert(
  product.includes('Item specifications') &&
    product.includes('product.specifications') &&
    product.includes('data-[state=active]:bg-dh-primary') &&
    productDetails.includes('extractDescriptionSpecificationRows') &&
    woocommerce.includes('/slug/${encodeURIComponent(slug)}'),
  'product details must show imported specifications, visible active tabs, and use the direct detail endpoint'
)
assert(
  woocommerce.includes('data?.summary?.averageRating') &&
    product.includes('averageRating: summary.averageRating') &&
    product.includes('ratingCount: summary.count') &&
    product.includes('getPublicFeedback(\'sellers\', sellerKey)') &&
    product.includes('% positive feedback'),
  'product ratings and seller reputation must come from their independent verified-feedback summaries'
)
assert(
  searchAutocomplete.includes('cameraInputRef') &&
    searchAutocomplete.includes('galleryInputRef') &&
    searchAutocomplete.includes('capture="environment"') &&
    searchAutocomplete.includes('Take photo') &&
    searchAutocomplete.includes('Gallery') &&
    searchAutocomplete.includes('prepareImageSearchFile') &&
    searchAutocomplete.includes('Finding similar products') &&
    searchAutocomplete.includes('suggestionContextMessage') &&
    imageSearch.includes('MAX_IMAGE_EDGE = 1600') &&
    imageSearch.includes("canvas.toBlob") &&
    imageSearch.includes("'image/jpeg'") &&
    woocommerce.includes('isFallback: Boolean(data.isFallback)'),
  'image search must retain separate mobile camera/gallery actions, client compression, and useful result context'
)
assert(
  !shop.includes("import SearchAutocomplete") &&
    !shop.includes('Search products, brands, parts, accessories...') &&
    shop.includes('dh-shop-category-rail') &&
    shop.includes('dh-shop-control-bar') &&
    shop.includes('aria-label="Active filters"') &&
    !shop.includes('Filters and sorting are applied across the full marketplace catalogue.') &&
    !shop.includes('Filters are active. Clear them anytime to return to the full marketplace.') &&
    searchAutocomplete.includes('suggestionRequestIdRef') &&
    searchAutocomplete.includes('setIsTextFocused(false)') &&
    searchAutocomplete.includes('textInputRef.current?.blur()') &&
    searchAutocomplete.includes('setSuggestions([])') &&
    searchAutocomplete.includes('flex-1 bg-transparent px-1 text-[16px]') &&
    globalStyles.includes(':is(input, select, textarea)') &&
    globalStyles.includes('font-size: 16px !important') &&
    globalStyles.includes('-webkit-text-size-adjust: 100%'),
  'shop and search pages must keep one iOS-safe search, dismiss submitted suggestions, and use one compact catalogue control surface'
)
assert(
  homeCategories.includes('dh-home-categories') &&
    homeCategories.includes('dh-home-category-card') &&
    homeCategories.includes('dh-home-category-count') &&
    globalStyles.includes("html[data-theme='dark'] .dh-home-categories") &&
    globalStyles.includes("html[data-theme='dark'] .dh-home-category-card") &&
    globalStyles.includes("html[data-theme='dark'] .dh-home-category-error"),
  'homepage categories must retain explicit readable light and dark surfaces'
)
assert(
  product.includes('lg:items-start') &&
    product.includes('product-info min-w-0 rounded-3xl') &&
    !product.includes('lg:sticky lg:top-24 lg:self-start'),
  'desktop product media and purchase cards must remain top-aligned'
)
assert(
  shop.includes('grid-cols-[104px_minmax(0,1fr)]') &&
    shop.includes("'grid-cols-1 gap-2 sm:gap-3'") &&
    shop.includes("'mb-1 hidden sm:flex'") &&
    !shop.includes('flex flex-col min-h-[220px]'),
  'shop list mode must keep one compact horizontal product row per mobile row'
)
assert(
  buyerChat.includes("size?: 'xs' | 'sm' | 'md'") &&
    buyerChat.includes('h-[calc(100dvh-7.25rem)]') &&
    buyerChat.includes('text-[12px] font-medium leading-[17px]') &&
    buyerChat.includes('mb-0.5 w-full rounded-xl px-2 py-1.5'),
  'chat inbox rows and message bubbles must retain the compact responsive density'
)
assert(
  html.includes('maximum-scale=5.0') &&
    html.includes('user-scalable=yes') &&
    html.includes('viewport-fit=cover'),
  'browser zoom must remain accessible while product gestures suppress accidental gallery opening'
)

assert(
  !orders.includes('Your order history') &&
    orders.includes("{ value: 'pending', label: 'Pending' }") &&
    orders.includes("{ value: 'processing', label: 'Processing' }") &&
    orders.includes("{ value: 'out-for-delivery', label: 'Out for delivery' }") &&
    orders.includes('filterCounts[filter.value]') &&
    orders.includes('View order'),
  'orders must retain compact cards and live filter counts without the old hero'
)
assert(
  orders.includes('perPage: 10') &&
    orders.includes('status: statusFilter') &&
    orders.includes('debouncedSearch') &&
    orders.includes('Page <strong') &&
    accountApi.includes('customerOrderMemoryCache') &&
    accountApi.includes('customerOrderInflight') &&
    accountApi.includes('CUSTOMER_ORDER_MEMORY_CACHE_MAX_ENTRIES = 60') &&
    accountApi.includes('clearCustomerOrderMemoryCache()'),
  'signed-in orders must stay paginated, debounced, account-scoped, and request-coalesced'
)
assert(
  cartDrawer.includes('grid-cols-[68px_minmax(0,1fr)]') &&
    cartDrawer.includes('divide-y divide-slate-100') &&
    cartDrawer.includes("storeGroups.length === 1 ? 'seller' : 'sellers'") &&
    !cartDrawer.includes('grid-cols-[96px_minmax(0,1fr)]') &&
    wishlistDrawer.includes('grid-cols-[68px_minmax(0,1fr)]') &&
    wishlistDrawer.includes('View full wishlist') &&
    !wishlistDrawer.includes('grid-cols-[96px_minmax(0,1fr)]'),
  'cart and wishlist drawer products must remain compact without losing their actions'
)
assert(
  sellerStore.includes('data-store-product-id') &&
    sellerStore.includes('loadMoreAnchorRef') &&
    sellerStore.includes('keepExistingProductInPlace') &&
    sellerStore.includes("root.style.scrollBehavior = 'auto'") &&
    sellerStore.includes('currentStore.products.concat(appendedProducts)') &&
    sellerStore.includes('filterRequestId !== filterRequestIdRef.current'),
  'seller-store pagination must append downward and preserve the last existing product viewport anchor'
)
assert(
  sellerDomainStore.includes('SellerDomainCommerceFooter') &&
    sellerDomainStore.includes('/product/${encodeURIComponent') &&
    sellerDomains.includes("label.includes('.')") &&
    sellerDomains.includes("label.startsWith('xn--')") &&
    storefrontServer.includes("res.status(421)") &&
    storefrontServer.includes('resolveSellerDomainHostname'),
  'seller domains must remain isolated branded storefronts with central secure transactions'
)
assert(
  sellerDomainStore.includes('SellerDomainCommerceHeader') &&
    sellerDomainStore.includes("type StoreViewMode = 'grid' | 'list'") &&
    sellerDomainStore.includes('aria-label="Grid view"') &&
    sellerDomainStore.includes('aria-label="List view"') &&
    sellerDomainStore.includes('<option value="popular">Popular</option>') &&
    sellerDomainStore.includes('<option value="price_asc">Price: low</option>') &&
    sellerDomainStore.includes('xl:grid-cols-5 2xl:grid-cols-6') &&
    sellerDomainStore.includes('aspect-[4/3]') &&
    sellerDomainStore.includes('filterRequestIdRef') &&
    !sellerDomainStore.includes('lg:grid-cols-[220px_minmax(0,1fr)]') &&
    !sellerDomainStore.includes('min-h-[170px]'),
  'seller personal stores must remain compact, product-first, sortable, and usable in grid or list view'
)
assert(
  sellerDomainStore.includes('lg:max-w-[640px]') &&
    sellerDomainStore.includes('handleAddToCart(product)') &&
    sellerDomainStore.includes('product.averageRating') &&
    sellerDomainStore.includes('product.ratingCount') &&
    sellerDomainStore.includes('toggleWishlist(product as unknown as Product)') &&
    sellerDomainStore.includes('sellerFeedbackText') &&
    sellerDomainStore.includes('<ShoppingCart className="h-3 w-3" /> Add') &&
    !sellerDomainStore.includes('Products by {seller.storeName}') &&
    !sellerDomainStore.includes('Accounts, messaging and payments remain protected'),
  'seller-domain landing pages must keep one compact commerce toolbar and marketplace-grade product actions without duplicate panels'
)
assert(
  sellerDomainStore.includes('SellerStoreSearchAutocomplete') &&
    sellerDomainStore.includes('fetchPublicSellerStoreSuggestions') === false &&
    sellerDomainStore.includes('minPrice') &&
    sellerDomainStore.includes('maxPrice') &&
    sellerDomainStore.includes('availability') &&
    sellerDomainStore.includes('Minimum price') &&
    sellerDomainStore.includes('Maximum price') &&
    sellerDomainStore.includes('snap-x snap-mandatory') &&
    sellerDomainStore.includes('href="/categories"') &&
    sellerDomainCategories.includes('Shop by category') &&
    sellerDomainCategories.includes('/?store_category=') &&
    appRouter.includes('path="/categories"'),
  'seller domains must retain seller-scoped autocomplete, compact price filters, a swipeable category rail, and category folders'
)
assert(
  appRouter.includes('sellerDomainHostname={sellerDomain.hostname}') &&
    appRouter.includes('path="/cart"') &&
    appRouter.includes('path="/order-complete"') &&
    product.includes('fetchSellerWooProductBySlug') &&
    product.includes('fetchPublicSellerStore(sellerDomainResolution.seller.key') &&
    sellerCheckout.includes('createSellerCheckoutHandoff') &&
    sellerCheckout.includes("form.method = 'POST'") &&
    sellerCheckout.includes("new URL('/checkout/store-handoff'") &&
    checkout.includes('consumeSellerCheckoutHandoff') &&
    checkout.includes("checkoutProgressStage !== 'confirmed'") &&
    sellerOrderComplete.includes('removeItem(itemId)') &&
    storefrontServer.includes("app.post('/checkout/store-handoff'") &&
    storefrontServer.includes("app.get('/api/checkout/store-handoff'") &&
    storefrontServer.includes('httpOnly: true') &&
    storefrontServer.includes("sameSite: 'lax'"),
  'seller-domain commerce must keep seller products/cart local and use the server-bound secure checkout handoff'
)
assert(
  sellerStore.includes('Visit our store') &&
    sellerStore.includes('target="_blank"') &&
    sellerStore.includes('setStorefrontUrl') &&
    !sellerStore.includes('window.location.replace(destination.toString())') &&
    !storefrontServer.includes('resolveSellerDomainForKey') &&
    !storefrontServer.includes('const sellerMatch = req.path.match'),
  'central seller pages must remain in the marketplace and expose the branded domain only as a new-tab link'
)
assert(
  tracking.includes('Coupon ') &&
    tracking.includes('Discount') &&
    tracking.includes('Shipping') &&
    tracking.includes("shippingTotal === 0 ? 'Free'") &&
    tracking.includes('taxTotal'),
  'full order detail must retain its transparent cost breakdown'
)
assert(
  tracking.includes('lg:items-start') &&
    tracking.includes('self-start rounded-2xl') &&
    !tracking.includes('Stock reservation'),
  'order cards must avoid stretched blank space and never expose stock-reservation internals'
)

assert(
  accountOrderIssue.includes('createCustomerOrderCase') &&
    accountOrderIssue.includes('replyToCustomerOrderCase') &&
    accountOrderIssue.includes('MAX_EVIDENCE_FILES = 5') &&
    accountOrderIssue.includes('compressEvidenceImage') &&
    accountOrderIssue.includes('video/mp4') &&
    supportLinks.includes('/account/orders/${encodeURIComponent(orderId)}/report'),
  'signed-in order reports must remain account-linked with controlled photo/video evidence'
)

console.log('Marketplace release validation passed')

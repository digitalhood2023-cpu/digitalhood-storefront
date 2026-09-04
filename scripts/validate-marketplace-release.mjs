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
const woocommerce = read('src/lib/woocommerce.ts')
const buyerChat = read('src/pages/AccountMessagesPage.tsx')
const orders = read('src/pages/OrdersPage.tsx')
const accountApi = read('src/api/account.ts')
const cartDrawer = read('src/features/cart/CartDrawer.tsx')
const wishlistDrawer = read('src/components/wishlist/WishlistDrawer.tsx')
const sellerStore = read('src/pages/SellerStorePage.tsx')
const sellerDomainStore = read('src/pages/SellerDomainStorefrontPage.tsx')
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
    checkout.includes('onCreatePayment={createCardPaymentOnSubmit}') &&
    checkout.includes('onConfirming={handleCardPaymentConfirming}'),
  'card fields must render immediately with no prepare-order step'
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
  checkout.includes('window.setTimeout(poll, 1500)') &&
    checkout.includes('elapsedMs < 30_000 ? 2500 : 5000') &&
    lencoApi.includes("cache: 'no-store'") &&
    paymentsApi.includes("cache: 'no-store'"),
  'payment checks must remain responsive, bounded, local-ledger based, and non-cacheable'
)

assert(
  buyerChat.includes("import ChatImageLightbox") &&
    buyerChat.includes('onOpenImage={setSelectedChatImage}') &&
    buyerChat.includes('<video') &&
    buyerChat.includes('playsInline'),
  'chat images must use the in-app lightbox while videos remain inline'
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
    product.includes('getPinchOriginPercent') &&
    product.includes('transformOrigin:') &&
    productGallery.includes('deduplicateProductImages'),
  'product galleries must support one-tap iOS opening, focal pinch zoom, and duplicate-image removal'
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
  sellerDomainStore.includes('Accounts, messaging and payments remain protected') &&
    sellerDomainStore.includes('/product/${encodeURIComponent') &&
    sellerDomains.includes("label.includes('.')") &&
    sellerDomains.includes("label.startsWith('xn--')") &&
    storefrontServer.includes("res.status(421)") &&
    storefrontServer.includes('resolveSellerDomainHostname'),
  'seller domains must remain isolated branded storefronts with central secure transactions'
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
  accountOrderIssue.includes('createCustomerOrderCase') &&
    accountOrderIssue.includes('replyToCustomerOrderCase') &&
    accountOrderIssue.includes('MAX_EVIDENCE_FILES = 5') &&
    accountOrderIssue.includes('compressEvidenceImage') &&
    accountOrderIssue.includes('video/mp4') &&
    supportLinks.includes('/account/orders/${encodeURIComponent(orderId)}/report'),
  'signed-in order reports must remain account-linked with controlled photo/video evidence'
)

console.log('Marketplace release validation passed')

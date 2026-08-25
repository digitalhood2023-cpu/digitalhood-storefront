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
const product = read('src/pages/ProductPage.tsx')
const buyerChat = read('src/pages/AccountMessagesPage.tsx')
const orders = read('src/pages/OrdersPage.tsx')
const tracking = read('src/pages/OrderTrackingDetailsPage.tsx')
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
const addressIndex = checkout.indexOf('Delivery Address')
const paymentIndex = checkout.indexOf('Payment Method')
assert(summaryIndex >= 0, 'order summary is missing')
assert(
  summaryIndex < addressIndex && addressIndex < paymentIndex,
  'checkout must render Summary, Address, then Payment in document order'
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
  stripe.includes('onProcessing?.()') &&
    stripe.includes('onFailure?.(message)') &&
    stripe.includes('await onSuccess()'),
  'card processing and results must flow through the shared blocking experience'
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
  html.includes('maximum-scale=1.0') &&
    html.includes('user-scalable=no') &&
    html.includes('viewport-fit=cover'),
  'browser page zoom must remain disabled while the controlled gallery owns zoom'
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
  tracking.includes('Coupon ') &&
    tracking.includes('Discount') &&
    tracking.includes('Shipping') &&
    tracking.includes("shippingTotal === 0 ? 'Free'") &&
    tracking.includes('taxTotal'),
  'full order detail must retain its transparent cost breakdown'
)

console.log('Marketplace release validation passed')

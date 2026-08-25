import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Hourglass,
  LockKeyhole,
  PackageCheck,
  Radio,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'

export type CheckoutProgressStage =
  | 'idle'
  | 'creating'
  | 'requesting-payment'
  | 'awaiting-approval'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'delayed'

type CheckoutProgressOverlayProps = {
  stage: CheckoutProgressStage
  paymentMethod: 'mobile' | 'card' | 'cod'
  statusMessage?: string
  resultTitle?: string
  resultMessage?: string
  nextStep?: string
  orderNumber?: string
  paymentReference?: string
  total: string
  deliveryLabel: string
  address: string
  canRetry?: boolean
  onRetry?: () => void
  onViewOrder?: () => void
  onContinueShopping?: () => void
}

const STAGE_COPY: Record<
  Exclude<CheckoutProgressStage, 'idle'>,
  { eyebrow: string; title: string; message: string }
> = {
  creating: {
    eyebrow: 'Secure checkout',
    title: 'Creating your order',
    message: 'We are checking stock, delivery and your order total.',
  },
  'requesting-payment': {
    eyebrow: 'Mobile Money',
    title: 'Sending your payment request',
    message: 'Keep this screen open and watch your phone for the approval prompt.',
  },
  'awaiting-approval': {
    eyebrow: 'Approval required',
    title: 'Approve on your phone',
    message: 'Enter your PIN only in your Mobile Money prompt. DigitalHood never asks for it.',
  },
  confirming: {
    eyebrow: 'Almost done',
    title: 'Just a moment — confirming your order',
    message: 'We are securely matching the payment and preparing your confirmation.',
  },
  confirmed: {
    eyebrow: 'Order confirmed',
    title: 'Thanks! Your order is confirmed',
    message: 'Your order is safely recorded and ready for fulfilment.',
  },
  failed: {
    eyebrow: 'Payment not completed',
    title: 'Your order needs attention',
    message: 'The payment could not be confirmed. Your order details are safe.',
  },
  delayed: {
    eyebrow: 'Confirmation delayed',
    title: 'We are still checking your payment',
    message: 'DigitalHood will continue reconciling this order securely in the background.',
  },
}

function ProgressIcon({
  stage,
}: {
  stage: Exclude<CheckoutProgressStage, 'idle'>
}) {
  if (stage === 'confirmed') return <Check className="h-8 w-8" />
  if (stage === 'failed') return <AlertCircle className="h-8 w-8" />
  if (stage === 'delayed') return <Hourglass className="h-8 w-8" />
  if (stage === 'awaiting-approval') return <Radio className="h-7 w-7" />
  if (stage === 'confirming') return <PackageCheck className="h-7 w-7" />
  return <LockKeyhole className="h-7 w-7" />
}

export default function CheckoutProgressOverlay({
  stage,
  paymentMethod,
  statusMessage,
  resultTitle,
  resultMessage,
  nextStep,
  orderNumber,
  paymentReference,
  total,
  deliveryLabel,
  address,
  canRetry = false,
  onRetry,
  onViewOrder,
  onContinueShopping,
}: CheckoutProgressOverlayProps) {
  if (stage === 'idle') return null

  const copy = STAGE_COPY[stage]
  const terminal = ['confirmed', 'failed', 'delayed'].includes(stage)
  const confirmed = stage === 'confirmed'
  const failed = stage === 'failed'
  const delayed = stage === 'delayed'
  const visibleSteps =
    paymentMethod === 'cod'
      ? ['Order details', 'Confirming', 'Complete']
      : [
          'Order details',
          paymentMethod === 'mobile' ? 'Phone approval' : 'Secure payment',
          'Complete',
        ]
  const activeStep = confirmed ? 2 : stage === 'creating' ? 0 : 1
  const palette = confirmed
    ? 'border-emerald-300/30 bg-emerald-900'
    : failed
      ? 'border-red-300/30 bg-[#4a1322]'
      : delayed
        ? 'border-amber-300/30 bg-[#49330c]'
        : 'border-white/10 bg-[#191744]'
  const accent = confirmed
    ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_0_10px_rgba(52,211,153,0.12)]'
    : failed
      ? 'bg-red-400 text-red-950 shadow-[0_0_0_10px_rgba(248,113,113,0.12)]'
      : delayed
        ? 'bg-amber-300 text-amber-950 shadow-[0_0_0_10px_rgba(252,211,77,0.12)]'
        : 'bg-white/10 text-[#ffbd59]'
  const stepAccent = confirmed
    ? 'bg-emerald-300'
    : failed
      ? 'bg-red-300'
      : delayed
        ? 'bg-amber-300'
        : 'bg-[#ffbd59]'

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto px-3 py-4 backdrop-blur-md ${
        confirmed
          ? 'bg-emerald-950/92'
          : failed
            ? 'bg-red-950/92'
            : delayed
              ? 'bg-amber-950/92'
              : 'bg-[#0d0c2d]/94'
      }`}
      role="alertdialog"
      aria-modal="true"
      aria-label={resultTitle || copy.title}
      aria-live="assertive"
    >
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-[1.75rem] border p-4 text-center text-white shadow-2xl sm:p-6 ${palette}`}
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-[#f5a623]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

        <div
          className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full ${accent}`}
        >
          {!terminal && (
            <span className="absolute inset-0 animate-ping rounded-full border border-[#ffbd59]/50" />
          )}
          <ProgressIcon stage={stage} />
        </div>

        <p
          className={`mt-4 text-[10px] font-black uppercase tracking-[0.22em] ${
            confirmed
              ? 'text-emerald-200'
              : failed
                ? 'text-red-200'
                : delayed
                  ? 'text-amber-200'
                  : 'text-[#ffbd59]'
          }`}
        >
          {copy.eyebrow}
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-black leading-tight sm:text-3xl">
          {resultTitle || copy.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-white/75">
          {resultMessage || statusMessage || copy.message}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-1.5">
          {visibleSteps.map((label, index) => (
            <div key={label} className="min-w-0">
              <div
                className={`h-1.5 rounded-full ${
                  index <= activeStep ? stepAccent : 'bg-white/10'
                }`}
              />
              <p
                className={`mt-1.5 truncate text-[9px] font-bold uppercase tracking-wide ${
                  index <= activeStep ? 'text-white' : 'text-white/35'
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-2 text-left sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-white/45">Order</dt>
            <dd className="mt-1 truncate text-xs font-black sm:text-sm">
              {orderNumber ? `#${orderNumber}` : 'Being created'}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-white/45">Total</dt>
            <dd className="mt-1 truncate text-xs font-black sm:text-sm">{total}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-white/45">Get it by</dt>
            <dd className="mt-1 line-clamp-2 text-xs font-black sm:text-sm">
              {deliveryLabel || 'Updating…'}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2.5">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-white/45">Shipping to</dt>
            <dd className="mt-1 line-clamp-2 text-xs font-black sm:text-sm">
              {address || 'Your delivery address'}
            </dd>
          </div>
        </dl>

        {paymentReference && terminal && (
          <p className="mt-3 break-all text-[11px] font-semibold text-white/55">
            Payment reference: {paymentReference}
          </p>
        )}

        {nextStep && terminal && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-left">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
              What happens next
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/80">
              {nextStep}
            </p>
          </div>
        )}

        {!terminal && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/45">
            <Clock3 className="h-3.5 w-3.5" /> Please do not close or refresh this
            page
          </p>
        )}

        {terminal && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {onViewOrder && orderNumber && (
              <button
                onClick={onViewOrder}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#17143f] transition hover:bg-white/90"
              >
                View order <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {failed && canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#5c1626] transition hover:bg-white/90"
              >
                <RefreshCw className="h-4 w-4" /> Try payment again
              </button>
            )}
            {onContinueShopping && (
              <button
                onClick={onContinueShopping}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
              >
                <ShoppingBag className="h-4 w-4" /> Continue shopping
              </button>
            )}
          </div>
        )}

        {confirmed && (
          <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-100">
            <ShieldCheck className="h-4 w-4" /> Secure confirmation complete
          </p>
        )}
      </div>
    </div>
  )
}

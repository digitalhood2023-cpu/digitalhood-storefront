import { Check, Clock3, LockKeyhole, PackageCheck, Radio, ShieldCheck } from 'lucide-react'

export type CheckoutProgressStage =
  | 'idle'
  | 'creating'
  | 'requesting-payment'
  | 'awaiting-approval'
  | 'confirming'
  | 'confirmed'

type CheckoutProgressOverlayProps = {
  stage: CheckoutProgressStage
  paymentMethod: 'mobile' | 'card' | 'cod'
  statusMessage?: string
  orderNumber?: string
  total: string
  deliveryLabel: string
  address: string
}

const STAGE_COPY: Record<Exclude<CheckoutProgressStage, 'idle'>, { eyebrow: string; title: string; message: string }> = {
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
    message: 'Your order is now safely in your DigitalHood account.',
  },
}

function ProgressIcon({ stage }: { stage: Exclude<CheckoutProgressStage, 'idle'> }) {
  if (stage === 'confirmed') return <Check className="h-9 w-9" />
  if (stage === 'awaiting-approval') return <Radio className="h-8 w-8" />
  if (stage === 'confirming') return <PackageCheck className="h-8 w-8" />
  return <LockKeyhole className="h-8 w-8" />
}

export default function CheckoutProgressOverlay({
  stage,
  paymentMethod,
  statusMessage,
  orderNumber,
  total,
  deliveryLabel,
  address,
}: CheckoutProgressOverlayProps) {
  if (stage === 'idle') return null

  const copy = STAGE_COPY[stage]
  const confirmed = stage === 'confirmed'
  const visibleSteps = paymentMethod === 'cod'
    ? ['Order details', 'Confirming', 'Complete']
    : ['Order details', paymentMethod === 'mobile' ? 'Phone approval' : 'Secure payment', 'Complete']
  const activeStep = confirmed ? 2 : stage === 'creating' ? 0 : 1

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto px-3 py-5 backdrop-blur-md ${confirmed ? 'bg-emerald-950/92' : 'bg-[#0d0c2d]/94'}`}
      role="alertdialog"
      aria-modal="true"
      aria-label={copy.title}
      aria-live="assertive"
    >
      <div className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] border p-5 text-center shadow-2xl sm:p-7 ${confirmed ? 'border-emerald-300/30 bg-emerald-900 text-white' : 'border-white/10 bg-[#191744] text-white'}`}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-[#f5a623]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${confirmed ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_0_12px_rgba(52,211,153,0.12)]' : 'bg-white/10 text-[#ffbd59]'}`}>
          {!confirmed && <span className="absolute inset-0 animate-ping rounded-full border border-[#ffbd59]/50" />}
          <ProgressIcon stage={stage} />
        </div>

        <p className={`mt-5 text-[10px] font-black uppercase tracking-[0.22em] ${confirmed ? 'text-emerald-200' : 'text-[#ffbd59]'}`}>{copy.eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-black leading-tight sm:text-3xl">{copy.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/70">{statusMessage || copy.message}</p>

        <div className="mt-6 grid grid-cols-3 gap-1.5">
          {visibleSteps.map((label, index) => (
            <div key={label} className="min-w-0">
              <div className={`h-1.5 rounded-full ${index <= activeStep ? confirmed ? 'bg-emerald-300' : 'bg-[#ffbd59]' : 'bg-white/10'}`} />
              <p className={`mt-2 truncate text-[9px] font-bold uppercase tracking-wide ${index <= activeStep ? 'text-white' : 'text-white/35'}`}>{label}</p>
            </div>
          ))}
        </div>

        <dl className="mt-6 grid gap-2 rounded-2xl bg-black/15 p-3 text-left sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-white/45">Order</dt><dd className="mt-1 text-sm font-black">{orderNumber ? `#${orderNumber}` : 'Being created'}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-white/45">Total</dt><dd className="mt-1 text-sm font-black">{total}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-white/45">Get it by</dt><dd className="mt-1 text-sm font-black">{deliveryLabel || 'Updating…'}</dd></div>
          <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-white/45">Shipping to</dt><dd className="mt-1 line-clamp-2 text-sm font-black">{address || 'Your delivery address'}</dd></div>
        </dl>

        {!confirmed && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/45">
            <Clock3 className="h-3.5 w-3.5" /> Please do not close or refresh this page
          </p>
        )}
        {confirmed && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-100">
            <ShieldCheck className="h-4 w-4" /> Secure confirmation complete
          </p>
        )}
      </div>
    </div>
  )
}

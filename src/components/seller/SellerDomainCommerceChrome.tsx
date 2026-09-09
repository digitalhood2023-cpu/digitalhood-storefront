import { Link } from 'react-router-dom'
import { CircleUserRound, ExternalLink, ShieldCheck, ShoppingCart, Store } from 'lucide-react'

import { getMarketplaceUrl } from '@/lib/sellerDomains'
import { useCartStore } from '@/store/cartStore'

type SellerChromeProps = {
  storeName?: string
  profilePhotoUrl?: string
  marketplaceBrand?: boolean
}

export function SellerDomainCommerceHeader({
  storeName = 'Marketplace store',
  profilePhotoUrl = '',
  marketplaceBrand = false,
}: SellerChromeProps) {
  const cartCount = useCartStore((state) => state.getCartCount())

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            {marketplaceBrand ? (
              <img src="/logo.jpg" alt="DigitalHood" className="h-full w-full object-contain" />
            ) : profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-4 w-4 text-[#26248c]" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[#26248c]">
              {marketplaceBrand ? 'DigitalHood Marketplace' : storeName}
            </span>
            <span className="hidden text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 sm:block">
              {marketplaceBrand ? 'Verified seller storefront' : 'Verified DigitalHood store'}
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1.5">
          <a
            href={getMarketplaceUrl('/account')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-slate-600 hover:bg-slate-100 sm:w-auto sm:px-3"
            aria-label="My account"
          >
            <CircleUserRound className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">My account</span>
          </a>
          <Link
            to="/cart"
            className="relative inline-flex h-9 items-center gap-1.5 rounded-full bg-[#26248c] px-3 text-xs font-black text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffb54a] px-1 text-[10px] text-[#17155f]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SellerDomainCommerceFooter({ storeName = 'this store' }: SellerChromeProps) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-[#17155f] text-white">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-black">
            <ShieldCheck className="h-4 w-4 text-[#ffb54a]" />
            Protected by DigitalHood
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white/60">
            Secure checkout, verified feedback and marketplace support for {storeName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-bold text-white/70">
          <a href={getMarketplaceUrl('/support')}>Support</a>
          <a href={getMarketplaceUrl('/marketplace-terms')}>Terms</a>
          <a href={getMarketplaceUrl('/shops')} className="inline-flex items-center gap-1">
            Marketplace <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import {
  ChevronDown,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  Twitter,
  Youtube,
} from 'lucide-react'

const shopLinks = [
  { name: 'Shop', href: '/shop' },
  { name: 'Categories', href: '/categories' },
  { name: 'Wishlist', href: '/wishlist' },
  { name: 'Track order', href: '/track-order' },
]

const supportLinks = [
  { name: 'Support Center', href: '/support' },
  { name: 'Track Support Case', href: '/support/track' },
  { name: 'Help', href: '/help' },
  { name: 'Shipping', href: '/shipping' },
  { name: 'Returns', href: '/returns' },
  { name: 'Warranty', href: '/warranty' },
]

const companyLinks = [
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Sell on DigitalHood', href: 'https://seller.digitalhood.info', external: true },
  { name: 'Marketplace Terms', href: '/marketplace-terms' },
  { name: 'Seller Terms', href: '/seller-terms' },
  { name: 'Prohibited Products', href: '/prohibited-products' },
  { name: 'Disputes & Refunds', href: '/dispute-resolution' },
  { name: 'Data Protection', href: '/data-protection' },
  { name: 'Incident Response', href: '/incident-response' },
  { name: 'Privacy', href: '/privacy' },
]

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/share/1AE1FSXZ6b/' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/digitalhood_zm' },
  { name: 'X', icon: Twitter, href: 'https://x.com/Digitalhood_Ltd' },
  { name: 'YouTube', icon: Youtube, href: 'https://www.youtube.com/@DigitalhoodZM' },
]

const trustItems = [
  { icon: ShieldCheck, title: 'Verified sellers', text: 'Approved stores' },
  { icon: Truck, title: 'Zambia delivery', text: 'Local fulfilment' },
  { icon: Store, title: 'Seller marketplace', text: 'Trusted commerce' },
]

type FooterLinkItem = { name: string; href: string; external?: boolean }

function FooterLink({ link }: { link: FooterLinkItem }) {
  const className = 'text-[13px] font-semibold text-white/65 transition hover:text-[#ffb54a]'

  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.name}
    </a>
  ) : (
    <Link to={link.href} className={className}>
      {link.name}
    </Link>
  )
}

function LinkGroup({ title, links }: { title: string; links: FooterLinkItem[] }) {
  return (
    <div>
      <div className="hidden sm:block">
        <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb54a]">{title}</h3>
        <div className="grid gap-x-4 gap-y-2">
          {links.map(link => <FooterLink key={link.name} link={link} />)}
        </div>
      </div>

      <details className="group border-b border-white/10 sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-xs font-black uppercase tracking-[0.16em] text-[#ffb54a]">
          {title}
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4">
          {links.map(link => <FooterLink key={link.name} link={link} />)}
        </div>
      </details>
    </div>
  )
}

export default function Footer() {
  return (
    <div className="mt-auto bg-[#16145f] pb-[env(safe-area-inset-bottom)]">
      <section className="border-y border-gray-100 bg-gray-50 px-3 py-3 sm:px-5 lg:px-8">
        <div className="mx-auto grid max-w-[1500px] grid-cols-3 gap-2">
          {trustItems.map(item => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2.5 ring-1 ring-gray-100 sm:px-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffb54a]/15 text-[#a76500]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black text-dh-primary sm:text-sm">{item.title}</p>
                  <p className="hidden truncate text-xs font-semibold text-gray-500 sm:block">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="bg-[#16145f] text-white">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-[1.25fr_0.65fr_0.8fr_1fr] sm:gap-7">
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5">
                <img src="/logo.jpg" alt="DigitalHood" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
                <div>
                  <p className="font-display text-xl font-black leading-none">Digital<span className="text-[#ffb54a]">Hood</span></p>
                  <p className="mt-1 text-[10px] font-bold text-[#ffb54a]">Marketplace Zambia</p>
                </div>
              </Link>

              <p className="mt-3 max-w-sm text-xs font-medium leading-5 text-white/60">Trusted tech, accessories, services and seller products across Zambia.</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-white/65 sm:grid">
                <a href="tel:+260971047570" className="inline-flex items-center gap-1.5 hover:text-[#ffb54a]">
                  <Phone className="h-3.5 w-3.5 text-[#ffb54a]" /> +260971047570
                </a>
                <a href="mailto:contact@digitalhood.info" className="inline-flex items-center gap-1.5 hover:text-[#ffb54a]">
                  <Mail className="h-3.5 w-3.5 text-[#ffb54a]" /> contact@digitalhood.info
                </a>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#ffb54a]" /> Lusaka, Zambia
                </span>
              </div>
            </div>

            <div className="grid sm:contents">
              <LinkGroup title="Shop" links={shopLinks} />
              <LinkGroup title="Support" links={supportLinks} />
              <LinkGroup title="Company" links={companyLinks} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-1.5">
              {socialLinks.map(social => {
                const Icon = social.icon
                return (
                  <a key={social.name} href={social.href} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/65 transition hover:bg-[#ffb54a] hover:text-dh-primary" aria-label={social.name}>
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                )
              })}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-white/45">
              <Link to="/privacy" className="hover:text-[#ffb54a]">Privacy</Link>
              <Link to="/terms" className="hover:text-[#ffb54a]">Terms</Link>
              <Link to="/sitemap" className="hover:text-[#ffb54a]">Sitemap</Link>
            </div>

            <p className="basis-full text-[10px] font-semibold text-white/35 sm:basis-auto">© {new Date().getFullYear()} DigitalHood. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

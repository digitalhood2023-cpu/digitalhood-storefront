import { Link } from 'react-router-dom'
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'

const shopLinks = [
  { name: 'Shop', href: '/shop' },
  { name: 'Categories', href: '/categories' },
  { name: 'Wishlist', href: '/wishlist' },
  { name: 'Track order', href: '/track-order' },
]

const supportLinks = [
  { name: 'Help', href: '/help' },
  { name: 'Shipping', href: '/shipping' },
  { name: 'Returns', href: '/returns' },
  { name: 'Warranty', href: '/warranty' },
]

const companyLinks = [
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Sell on DigitalHood', href: 'https://seller.digitalhood.info', external: true },
  { name: 'Terms', href: '/terms' },
  { name: 'Privacy', href: '/privacy' },
]

const trustItems = [
  {
    icon: ShieldCheck,
    title: 'Verified sellers',
    text: 'Approved marketplace stores.',
  },
  {
    icon: Truck,
    title: 'Zambia delivery',
    text: 'Local fulfilment support.',
  },
  {
    icon: Store,
    title: 'Seller marketplace',
    text: 'Built for trusted commerce.',
  },
]

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  const className =
    'text-sm font-semibold text-white/65 transition-colors hover:text-[#ffb54a]'

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}

function LinkGroup({
  title,
  links,
}: {
  title: string
  links: Array<{ name: string; href: string; external?: boolean }>
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#ffb54a]">
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:block sm:space-y-2">
        {links.map((link) => (
          <FooterLink key={link.name} href={link.href} external={link.external}>
            {link.name}
          </FooterLink>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="bg-[#16145f] text-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10 xl:px-12">
        <div className="grid gap-7 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="DigitalHood"
                className="h-11 w-11 rounded-2xl object-contain"
              />

              <div>
                <p className="font-display text-xl font-black leading-none">
                  DigitalHood
                </p>
                <p className="mt-1 text-xs font-bold text-[#ffb54a]">
                  Marketplace Zambia
                </p>
              </div>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Shop trusted phones, laptops, accessories, services and seller
              products across Zambia.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Phone, text: '+260 97 000 0000' },
                { icon: Mail, text: 'support@digitalhood.info' },
                { icon: MapPin, text: 'Lusaka, Zambia' },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <span
                    key={item.text}
                    className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-xs font-bold text-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#ffb54a]" />
                    {item.text}
                  </span>
                )
              })}
            </div>
          </div>

          <LinkGroup title="Shop" links={shopLinks} />
          <LinkGroup title="Support" links={supportLinks} />
          <LinkGroup title="Company" links={companyLinks} />
        </div>

        <div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffb54a]/15 text-[#ffb54a]">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="truncate text-xs font-semibold text-white/55">
                    {item.text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs font-semibold text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} DigitalHood. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/8 p-2 text-white/60 transition hover:text-[#ffb54a]"
              aria-label="DigitalHood on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/8 p-2 text-white/60 transition hover:text-[#ffb54a]"
              aria-label="DigitalHood on Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>

            <Link to="/privacy" className="hover:text-[#ffb54a]">
              Privacy
            </Link>

            <Link to="/terms" className="hover:text-[#ffb54a]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

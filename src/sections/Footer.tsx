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
    'block text-sm font-semibold text-white/65 transition-colors hover:text-[#ffb54a]'

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
    <div className="text-center sm:text-left">
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#ffb54a]">
        {title}
      </h3>

      <div className="space-y-2">
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
    <>
      <section className="bg-gray-50 px-4 py-5 sm:px-6 lg:px-8 xl:px-12">
        <div className="mx-auto grid max-w-[1500px] gap-3 sm:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className="flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-gray-100 sm:justify-start sm:text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb54a]/15 text-[#b87500]">
                  <Icon className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-black text-dh-primary">
                    {item.title}
                  </p>
                  <p className="text-xs font-semibold text-gray-500">
                    {item.text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="bg-[#16145f] text-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-9">
          <div className="grid gap-8 text-center lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr] lg:text-left">
            <div className="mx-auto max-w-md lg:mx-0">
              <Link to="/" className="inline-flex items-center justify-center gap-3 lg:justify-start">
                <img
                  src="/logo.jpg"
                  alt="DigitalHood"
                  className="h-12 w-12 rounded-2xl bg-white object-contain p-1"
                />

                <div>
                  <p className="font-display text-2xl font-black leading-none">
                    Digital<span className="text-[#ffb54a]">Hood</span>
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#ffb54a]">
                    Marketplace Zambia
                  </p>
                </div>
              </Link>

              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/65 lg:mx-0">
                Trusted phones, laptops, accessories, services and seller
                products across Zambia.
              </p>

              <div className="mt-5 grid gap-2 text-sm font-bold text-white/70 sm:grid-cols-3 lg:grid-cols-1">
                <a
                  href="tel:+260971047570"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-3 py-2 hover:text-[#ffb54a] lg:justify-start"
                >
                  <Phone className="h-4 w-4 text-[#ffb54a]" />
                  +260971047570
                </a>

                <a
                  href="mailto:contact@digitalhood.info"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-3 py-2 hover:text-[#ffb54a] lg:justify-start"
                >
                  <Mail className="h-4 w-4 text-[#ffb54a]" />
                  contact@digitalhood.info
                </a>

                <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/8 px-3 py-2 lg:justify-start">
                  <MapPin className="h-4 w-4 text-[#ffb54a]" />
                  Lusaka, Zambia
                </span>
              </div>
            </div>

            <LinkGroup title="Shop" links={shopLinks} />
            <LinkGroup title="Support" links={supportLinks} />
            <LinkGroup title="Company" links={companyLinks} />
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-4 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
            <div className="flex items-center justify-center gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon

                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/65 transition hover:bg-[#ffb54a] hover:text-dh-primary"
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-white/45">
              <Link to="/privacy" className="hover:text-[#ffb54a]">
                Privacy
              </Link>

              <Link to="/terms" className="hover:text-[#ffb54a]">
                Terms
              </Link>

              <Link to="/sitemap" className="hover:text-[#ffb54a]">
                Sitemap
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-semibold text-white/40">
            © {new Date().getFullYear()} DigitalHood. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}

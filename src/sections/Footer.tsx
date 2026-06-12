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
  { name: 'Sell', href: 'https://seller.digitalhood.info', external: true },
  { name: 'Privacy', href: '/privacy' },
]

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/share/1AE1FSXZ6b/' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/digitalhood_zm' },
]

const trustItems = [
  { icon: ShieldCheck, text: 'Secure checkout' },
  { icon: Truck, text: 'Zambia delivery' },
  { icon: Store, text: 'Verified sellers' },
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
    'text-xs font-bold text-white/65 transition hover:text-[#ffb54a]'

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
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb54a]">
        {title}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:block sm:space-y-1.5">
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
    <footer className="bg-dh-primary text-white">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr] lg:items-start">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:block">
              <Link to="/" className="inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white p-1">
                  <img
                    src="/logo.jpg"
                    alt="DigitalHood"
                    className="h-full w-full object-contain"
                  />
                </span>

                <div>
                  <p className="font-display text-xl font-black leading-none">
                    Digital<span className="text-[#ffb54a]">Hood</span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-white/45">
                    Fixing tomorrow today
                  </p>
                </div>
              </Link>

              <div className="flex gap-2 lg:mt-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon

                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/70 transition hover:bg-[#ffb54a] hover:text-dh-primary"
                      aria-label={social.name}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="tel:+260971047570"
                className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-1.5 text-xs font-bold text-white/65 hover:text-[#ffb54a]"
              >
                <Phone className="h-3.5 w-3.5 text-[#ffb54a]" />
                +260971047570
              </a>

              <a
                href="mailto:contact@digitalhood.info"
                className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-1.5 text-xs font-bold text-white/65 hover:text-[#ffb54a]"
              >
                <Mail className="h-3.5 w-3.5 text-[#ffb54a]" />
                contact@digitalhood.info
              </a>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-1.5 text-xs font-bold text-white/65">
                <MapPin className="h-3.5 w-3.5 text-[#ffb54a]" />
                Lusaka, Zambia
              </span>
            </div>
          </div>

          <LinkGroup title="Shop" links={shopLinks} />
          <LinkGroup title="Support" links={supportLinks} />
          <LinkGroup title="Company" links={companyLinks} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {trustItems.map((item) => {
            const Icon = item.icon

            return (
              <span
                key={item.text}
                className="inline-flex items-center gap-2 rounded-full bg-white/7 px-3 py-1.5 text-xs font-black text-white/65"
              >
                <Icon className="h-3.5 w-3.5 text-[#ffb54a]" />
                {item.text}
              </span>
            )
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs font-semibold text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DigitalHood. All rights reserved.</p>

          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="hover:text-[#ffb54a]">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-[#ffb54a]">
              Privacy
            </Link>
            <Link to="/sitemap" className="hover:text-[#ffb54a]">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

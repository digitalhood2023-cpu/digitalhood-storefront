import { Link } from 'react-router-dom'
import {
  CreditCard,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  Twitter,
  Youtube,
} from 'lucide-react'

const marketplaceLinks = [
  { name: 'Shop all products', href: '/shop' },
  { name: 'Shop categories', href: '/categories' },
  { name: 'Recently viewed', href: '/recently-viewed' },
  { name: 'Wishlist', href: '/wishlist' },
  { name: 'Deals', href: '/shop?category=deals' },
]

const accountLinks = [
  { name: 'My account', href: '/account' },
  { name: 'My orders', href: '/orders' },
  { name: 'Track order', href: '/track-order' },
  { name: 'Sign in', href: '/login' },
  { name: 'Create account', href: '/register' },
]

const supportLinks = [
  { name: 'Help centre', href: '/help' },
  { name: 'FAQs', href: '/faqs' },
  { name: 'Shipping information', href: '/shipping' },
  { name: 'Returns & refunds', href: '/returns' },
  { name: 'Warranty policy', href: '/warranty' },
  { name: 'Contact us', href: '/contact' },
]

const companyLinks = [
  { name: 'About DigitalHood', href: '/about' },
  { name: 'Sell on DigitalHood', href: 'https://seller.digitalhood.info', external: true },
  { name: 'Blog', href: '/blog' },
  { name: 'Terms & conditions', href: '/terms' },
  { name: 'Privacy policy', href: '/privacy' },
  { name: 'Cookie policy', href: '/cookies' },
  { name: 'Sitemap', href: '/sitemap' },
]

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
]

function FooterLink({ link }: { link: { name: string; href: string; external?: boolean } }) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-white/70 transition-colors hover:text-dh-secondary"
      >
        {link.name}
      </a>
    )
  }

  return (
    <Link
      to={link.href}
      className="text-sm text-white/70 transition-colors hover:text-dh-secondary"
    >
      {link.name}
    </Link>
  )
}

export default function Footer() {
  return (
    <footer className="bg-dh-primary text-white">
      <div className="border-b border-white/10 bg-white/5">
        <div className="container mx-auto grid gap-4 px-4 py-6 sm:grid-cols-3 lg:px-8 xl:px-12">
          {[
            { icon: ShieldCheck, title: 'Secure checkout', text: 'Protected payments and clear order records.' },
            { icon: Truck, title: 'Zambia delivery support', text: 'Delivery and pickup support as the marketplace grows.' },
            { icon: Store, title: 'Seller marketplace', text: 'Approved sellers can apply through seller.digitalhood.info.' },
          ].map((item) => {
            const Icon = item.icon

            return (
              <div key={item.title} className="flex gap-3 rounded-2xl bg-white/5 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-dh-secondary text-dh-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-white/65">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 lg:py-16 xl:px-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="mb-5 flex items-center gap-3">
              <img src="/logo.jpg" alt="DigitalHood" className="h-12 w-12 object-contain" />
              <div>
                <p className="font-display text-2xl font-bold">
                  Digital<span className="text-dh-secondary">Hood</span>
                </p>
                <p className="text-xs tracking-wider text-white/55">
                  FIXING TOMORROW TODAY
                </p>
              </div>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              DigitalHood is Zambia’s marketplace for phones, laptops, accessories,
              services and everyday digital products — built for customers,
              sellers and trusted commerce.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/75">
                <MapPin className="h-4 w-4 text-dh-secondary" />
                <span>Lusaka, Zambia</span>
              </div>
              <a
                href="tel:+260971047570"
                className="flex items-center gap-3 text-sm text-white/75 hover:text-dh-secondary"
              >
                <Phone className="h-4 w-4 text-dh-secondary" />
                <span>+260971047570</span>
              </a>
              <a
                href="mailto:contact@digitalhood.info"
                className="flex items-center gap-3 text-sm text-white/75 hover:text-dh-secondary"
              >
                <Mail className="h-4 w-4 text-dh-secondary" />
                <span>contact@digitalhood.info</span>
              </a>
            </div>
          </div>

          {[
            ['Marketplace', marketplaceLinks],
            ['Account', accountLinks],
            ['Support', supportLinks],
            ['Company', companyLinks],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 className="mb-5 font-display text-lg font-semibold">{title as string}</h4>
              <ul className="space-y-3">
                {(links as typeof marketplaceLinks).map((link) => (
                  <li key={link.name}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 font-semibold">Follow DigitalHood</p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-all hover:bg-dh-secondary hover:text-dh-primary"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 font-semibold">Payment options</p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <CreditCard className="h-4 w-4 text-dh-secondary" />
                <span className="text-xs">Cards</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <Smartphone className="h-4 w-4 text-dh-secondary" />
                <span className="text-xs">Mobile Money</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-center md:flex-row md:text-left lg:px-8 xl:px-12">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} DigitalHood. All rights reserved. Made in Zambia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/terms" className="text-sm text-white/60 transition-colors hover:text-dh-secondary">
              Terms
            </Link>
            <Link to="/privacy" className="text-sm text-white/60 transition-colors hover:text-dh-secondary">
              Privacy
            </Link>
            <Link to="/sitemap" className="text-sm text-white/60 transition-colors hover:text-dh-secondary">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Mail, Phone, ShieldCheck } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'

const pageContent: Record<
  string,
  {
    title: string
    eyebrow: string
    description: string
    sections: Array<{ title: string; text: string }>
  }
> = {
  '/cookies': {
    eyebrow: 'Legal',
    title: 'Cookie policy',
    description: 'How cookies and local storage support the DigitalHood shopping experience.',
    sections: [
      { title: 'Shopping experience', text: 'Cookies and local storage may help remember cart, wishlist, recently viewed products and preferences.' },
      { title: 'Analytics and performance', text: 'DigitalHood may use privacy-conscious tools to improve speed, reliability and customer experience.' },
      { title: 'Browser control', text: 'You can manage cookies through your browser settings.' },
    ],
  },
  '/sitemap': {
    eyebrow: 'Navigate',
    title: 'Sitemap',
    description: 'Main DigitalHood pages and marketplace links.',
    sections: [
      { title: 'Marketplace', text: 'Home, Shop, Categories, Wishlist, Recently Viewed, Cart and Checkout.' },
      { title: 'Account', text: 'Login, Register, Account, Orders and Track Order.' },
      { title: 'Support', text: 'Help, FAQs, Shipping, Returns, Warranty, Contact and Legal pages.' },
    ],
  },
  '/blog': {
    eyebrow: 'DigitalHood updates',
    title: 'Blog',
    description: 'Marketplace news, product guides and DigitalHood updates will appear here.',
    sections: [
      { title: 'Buying guides', text: 'Helpful guides for phones, laptops, accessories and digital products.' },
      { title: 'Marketplace updates', text: 'DigitalHood feature updates, seller news and customer improvements.' },
      { title: 'Coming soon', text: 'The blog foundation is ready and can be expanded with real posts later.' },
    ],
  },
}

export default function InfoPage() {
  const location = useLocation()
  const content = pageContent[location.pathname] || pageContent['/sitemap']

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <SEO title={content.title} description={content.description} path={location.pathname} />
      <Header />

      <main className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <section className="overflow-hidden rounded-3xl bg-dh-primary text-white shadow-sm">
            <div className="p-6 md:p-10">
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-dh-secondary">
                {content.eyebrow}
              </p>
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                {content.title}
              </h1>
              <p className="mt-4 max-w-3xl text-white/75">
                {content.description}
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {content.sections.map((section) => (
              <article key={section.title} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/20 text-dh-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-display text-xl font-bold text-dh-primary">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-dh-dark-gray">
                  {section.text}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-dh-primary">
                  Need direct support?
                </h2>
                <p className="mt-1 text-sm text-dh-dark-gray">
                  Contact DigitalHood and we’ll help with your marketplace request.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="tel:+260971047570"
                  className="inline-flex items-center rounded-full bg-dh-primary px-5 py-3 text-sm font-semibold text-white"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  +260971047570
                </a>
                <a
                  href="mailto:contact@digitalhood.info"
                  className="inline-flex items-center rounded-full border border-dh-primary px-5 py-3 text-sm font-semibold text-dh-primary"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  contact@digitalhood.info
                </a>
                <Link
                  to="/shop"
                  className="inline-flex items-center rounded-full bg-dh-secondary px-5 py-3 text-sm font-semibold text-dh-primary"
                >
                  Continue shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
